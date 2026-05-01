import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useDatabaseMode } from '../context/DatabaseModeContext'
import {
  fetchRooms,
  fetchActiveAdmissions,
  createAdmission,
  dischargePatient,
  fetchPeriodicControls,
  createPeriodicControl,
  fetchAllPatients,
  fetchAllDoctors,
  fetchAllNurses,
} from '../api/personnelApi'
import { Badge } from '../components/ui'
import type { RoomDTO, AdmissionDTO, PeriodicControlDTO, RoomType, RoomStatus } from '../api/types'

// ──────────────────────────────────────────────────────────
// Demo data
// ──────────────────────────────────────────────────────────
const DEMO_ROOMS: RoomDTO[] = [
  { id: 'r-101', number: '101', floor: 1, wing: 'A', type: 'general',   capacity: 2, status: 'occupied',     notes: null, currentPatientId: 'p-001', currentPatientName: 'Alice Johnson' },
  { id: 'r-102', number: '102', floor: 1, wing: 'A', type: 'general',   capacity: 2, status: 'available',    notes: null },
  { id: 'r-103', number: '103', floor: 1, wing: 'A', type: 'general',   capacity: 2, status: 'maintenance',  notes: 'HVAC repair' },
  { id: 'r-104', number: '104', floor: 1, wing: 'A', type: 'general',   capacity: 2, status: 'available',    notes: null },
  { id: 'r-105', number: '105', floor: 1, wing: 'A', type: 'general',   capacity: 2, status: 'reserved',     notes: null },
  { id: 'r-201', number: '201', floor: 2, wing: 'B', type: 'general',   capacity: 1, status: 'occupied',     notes: null, currentPatientId: 'p-002', currentPatientName: 'Bob Smith' },
  { id: 'r-202', number: '202', floor: 2, wing: 'B', type: 'general',   capacity: 1, status: 'available',    notes: null },
  { id: 'r-surg-1', number: 'SURG-1', floor: 2, wing: 'C', type: 'surgical', capacity: 1, status: 'available', notes: null },
  { id: 'r-icu-1',  number: 'ICU-1',  floor: 3, wing: 'ICU', type: 'icu',     capacity: 1, status: 'occupied',  notes: null, currentPatientId: 'p-003', currentPatientName: 'Carol White' },
  { id: 'r-icu-2',  number: 'ICU-2',  floor: 3, wing: 'ICU', type: 'icu',     capacity: 1, status: 'available', notes: null },
  { id: 'r-peds-1', number: 'PEDS-1', floor: 1, wing: 'D', type: 'pediatric', capacity: 2, status: 'available', notes: null },
  { id: 'r-mat-1',  number: 'MAT-1',  floor: 4, wing: 'E', type: 'maternity', capacity: 1, status: 'available', notes: null },
  { id: 'r-iso-1',  number: 'ISO-1',  floor: 3, wing: 'F', type: 'isolation', capacity: 1, status: 'available', notes: null },
]

const DEMO_ADMISSIONS: AdmissionDTO[] = [
  {
    id: 'adm-001', patientId: 'p-001', patientName: 'Alice Johnson',
    roomId: 'r-101', roomNumber: '101',
    admittedBy: 'u-desk', admittedByName: 'Front Desk',
    primaryDoctorId: 'd-001', primaryDoctorName: 'Dr. Emily Carter',
    admissionType: 'elective', diagnosis: 'Post-op monitoring (appendectomy)',
    notes: null, admittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    expectedDischarge: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    dischargedAt: null, status: 'active',
  },
  {
    id: 'adm-002', patientId: 'p-002', patientName: 'Bob Smith',
    roomId: 'r-201', roomNumber: '201',
    admittedBy: 'u-desk', admittedByName: 'Front Desk',
    primaryDoctorId: 'd-002', primaryDoctorName: 'Dr. Michael Lee',
    admissionType: 'emergency', diagnosis: 'Chest pain / cardiac observation',
    notes: 'Continuous cardiac monitoring', admittedAt: new Date(Date.now() - 86400000).toISOString(),
    expectedDischarge: null, dischargedAt: null, status: 'active',
  },
  {
    id: 'adm-003', patientId: 'p-003', patientName: 'Carol White',
    roomId: 'r-icu-1', roomNumber: 'ICU-1',
    admittedBy: 'u-desk', admittedByName: 'Front Desk',
    primaryDoctorId: 'd-001', primaryDoctorName: 'Dr. Emily Carter',
    admissionType: 'emergency', diagnosis: 'Respiratory failure',
    notes: 'Ventilator support', admittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    expectedDischarge: null, dischargedAt: null, status: 'active',
  },
]

const DEMO_CONTROLS: PeriodicControlDTO[] = [
  {
    id: 'pc-001', admissionId: 'adm-001', patientId: 'p-001', patientName: 'Alice Johnson',
    title: 'Blood pressure check', description: 'Both arms, record systolic/diastolic',
    frequencyHours: 4, nextDue: new Date(Date.now() + 2 * 3600000).toISOString(),
    doctorId: 'd-001', doctorName: 'Dr. Emily Carter', nurseId: null, nurseName: null,
    createdBy: 'u-nurse', active: true, createdAt: new Date().toISOString(),
  },
  {
    id: 'pc-002', admissionId: 'adm-001', patientId: 'p-001', patientName: 'Alice Johnson',
    title: 'Wound dressing change', description: 'Inspect incision site, apply fresh dressing',
    frequencyHours: 12, nextDue: new Date(Date.now() + 6 * 3600000).toISOString(),
    doctorId: null, doctorName: null, nurseId: 'u-nurse', nurseName: 'Nurse Sarah',
    createdBy: 'u-nurse', active: true, createdAt: new Date().toISOString(),
  },
]

const DEMO_PATIENTS = [
  { id: 'p-001', name: 'Alice Johnson', mrn: 'MRN-001' },
  { id: 'p-002', name: 'Bob Smith', mrn: 'MRN-002' },
  { id: 'p-003', name: 'Carol White', mrn: 'MRN-003' },
  { id: 'p-004', name: 'David Kim', mrn: 'MRN-004' },
]

const DEMO_DOCTORS = [
  { id: 'd-001', name: 'Dr. Emily Carter', specialty: 'Internal Medicine' },
  { id: 'd-002', name: 'Dr. Michael Lee', specialty: 'Cardiology' },
]

const DEMO_NURSES = [
  { id: 'n-001', name: 'Nurse Sarah' },
  { id: 'n-002', name: 'Nurse James' },
]

// ──────────────────────────────────────────────────────────
// Helper: Room card status color
// ──────────────────────────────────────────────────────────
function roomStatusColor(status: RoomStatus) {
  switch (status) {
    case 'available':   return 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
    case 'occupied':    return 'border-rose-300    bg-rose-50    dark:border-rose-700    dark:bg-rose-900/20'
    case 'maintenance': return 'border-amber-300   bg-amber-50   dark:border-amber-700   dark:bg-amber-900/20'
    case 'reserved':    return 'border-sky-300     bg-sky-50     dark:border-sky-700     dark:bg-sky-900/20'
  }
}

function roomTypeBadge(type: RoomType) {
  const map: Record<RoomType, string> = {
    general:   'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    icu:       'bg-rose-100  text-rose-700  dark:bg-rose-900/40 dark:text-rose-300',
    surgical:  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    pediatric: 'bg-sky-100  text-sky-700   dark:bg-sky-900/40 dark:text-sky-300',
    maternity: 'bg-pink-100 text-pink-700  dark:bg-pink-900/40 dark:text-pink-300',
    isolation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  }
  return map[type]
}

type Tab = 'roomBoard' | 'admissions' | 'admit' | 'periodicControls'

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
export function InpatientManagementPage() {
  const { user } = useAuth()
  const { isDemoMode } = useDatabaseMode()
  const { t } = useTranslation('admin')

  const [tab, setTab] = useState<Tab>('roomBoard')

  // Data
  const [rooms, setRooms] = useState<RoomDTO[]>([])
  const [admissions, setAdmissions] = useState<AdmissionDTO[]>([])
  const [controls, setControls] = useState<PeriodicControlDTO[]>([])
  const [patients, setPatients] = useState<{ id: string; name: string; mrn: string }[]>([])
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string | null }[]>([])
  const [nurses, setNurses] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('')

  // Admit form
  const [admitPatientId, setAdmitPatientId] = useState('')
  const [admitPatientSearch, setAdmitPatientSearch] = useState('')
  const [admitRoomId, setAdmitRoomId] = useState('')
  const [admitDoctorId, setAdmitDoctorId] = useState('')
  const [admitType, setAdmitType] = useState<'emergency' | 'elective' | 'transfer'>('elective')
  const [admitDiagnosis, setAdmitDiagnosis] = useState('')
  const [admitNotes, setAdmitNotes] = useState('')
  const [admitExpectedDischarge, setAdmitExpectedDischarge] = useState('')
  const [admitting, setAdmitting] = useState(false)

  // Control form
  const [showControlForm, setShowControlForm] = useState(false)
  const [ctrlTitle, setCtrlTitle] = useState('')
  const [ctrlDesc, setCtrlDesc] = useState('')
  const [ctrlFreq, setCtrlFreq] = useState('6')
  const [ctrlFirstDue, setCtrlFirstDue] = useState('')
  const [ctrlDoctorId, setCtrlDoctorId] = useState('')
  const [ctrlNurseId, setCtrlNurseId] = useState('')
  const [savingCtrl, setSavingCtrl] = useState(false)

  // ──────────────────────────────────────────────────────
  // Load data
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) {
      setRooms(DEMO_ROOMS)
      setAdmissions(DEMO_ADMISSIONS)
      setPatients(DEMO_PATIENTS)
      setDoctors(DEMO_DOCTORS)
      setNurses(DEMO_NURSES)
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const [r, a, p, d, n] = await Promise.all([
          fetchRooms(),
          fetchActiveAdmissions(),
          fetchAllPatients(),
          fetchAllDoctors(),
          fetchAllNurses(),
        ])
        setRooms(r)
        setAdmissions(a)
        setPatients(p)
        setDoctors(d)
        setNurses(n)
      } catch {
        toast.error('Failed to load inpatient data.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [isDemoMode])

  // Load controls when admission selected
  useEffect(() => {
    if (!selectedAdmissionId) { setControls([]); return }
    if (isDemoMode) {
      setControls(DEMO_CONTROLS.filter((c) => c.admissionId === selectedAdmissionId))
      return
    }
    void fetchPeriodicControls(selectedAdmissionId).then(setControls).catch(() => toast.error('Failed to load controls.'))
  }, [selectedAdmissionId, isDemoMode])

  // ──────────────────────────────────────────────────────
  // Admit patient
  // ──────────────────────────────────────────────────────
  const handleAdmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!admitPatientId || !admitRoomId) return
    setAdmitting(true)
    try {
      if (!isDemoMode) {
        await createAdmission({
          patientId: admitPatientId, roomId: admitRoomId,
          admittedBy: user?.id ?? '',
          primaryDoctorId: admitDoctorId || undefined,
          admissionType: admitType,
          diagnosis: admitDiagnosis || undefined,
          notes: admitNotes || undefined,
          expectedDischarge: admitExpectedDischarge || undefined,
        })
        const [r, a] = await Promise.all([fetchRooms(), fetchActiveAdmissions()])
        setRooms(r); setAdmissions(a)
      } else {
        // Demo: optimistic update
        const pat = patients.find((p) => p.id === admitPatientId)
        const room = rooms.find((r) => r.id === admitRoomId)
        const doc = doctors.find((d) => d.id === admitDoctorId)
        const newAdm: AdmissionDTO = {
          id: 'adm-' + Date.now(), patientId: admitPatientId,
          patientName: pat?.name ?? '',
          roomId: admitRoomId, roomNumber: room?.number ?? null,
          admittedBy: user?.id ?? '', admittedByName: 'You',
          primaryDoctorId: admitDoctorId || null,
          primaryDoctorName: doc?.name ?? null,
          admissionType: admitType,
          diagnosis: admitDiagnosis || null, notes: admitNotes || null,
          admittedAt: new Date().toISOString(),
          expectedDischarge: admitExpectedDischarge || null,
          dischargedAt: null, status: 'active',
        }
        setAdmissions((prev) => [newAdm, ...prev])
        setRooms((prev) => prev.map((r) => r.id === admitRoomId ? { ...r, status: 'occupied' as RoomStatus, currentPatientId: admitPatientId, currentPatientName: pat?.name } : r))
      }
      toast.success(t('admin:inpatient.admit.successToast'))
      setAdmitPatientId(''); setAdmitPatientSearch(''); setAdmitRoomId('')
      setAdmitDoctorId(''); setAdmitDiagnosis(''); setAdmitNotes(''); setAdmitExpectedDischarge('')
      setTab('admissions')
    } catch {
      toast.error(t('admin:inpatient.admit.errorToast'))
    } finally {
      setAdmitting(false)
    }
  }

  // ──────────────────────────────────────────────────────
  // Discharge
  // ──────────────────────────────────────────────────────
  const handleDischarge = async (adm: AdmissionDTO) => {
    if (!window.confirm(t('admin:inpatient.admissions.dischargeConfirm'))) return
    try {
      if (!isDemoMode) {
        await dischargePatient(adm.id, adm.roomId ?? '')
        const [r, a] = await Promise.all([fetchRooms(), fetchActiveAdmissions()])
        setRooms(r); setAdmissions(a)
      } else {
        setAdmissions((prev) => prev.filter((a) => a.id !== adm.id))
        if (adm.roomId) {
          setRooms((prev) => prev.map((r) => r.id === adm.roomId ? { ...r, status: 'available' as RoomStatus, currentPatientId: null, currentPatientName: null } : r))
        }
      }
      toast.success(t('admin:inpatient.admissions.discharged'))
      if (selectedAdmissionId === adm.id) setSelectedAdmissionId('')
    } catch {
      toast.error('Failed to discharge patient.')
    }
  }

  // ──────────────────────────────────────────────────────
  // Create periodic control
  // ──────────────────────────────────────────────────────
  const handleSaveControl = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedAdmissionId || !ctrlTitle || !ctrlFreq || !ctrlFirstDue) return
    setSavingCtrl(true)
    const adm = admissions.find((a) => a.id === selectedAdmissionId)
    try {
      if (!isDemoMode) {
        const created = await createPeriodicControl({
          admissionId: selectedAdmissionId,
          patientId: adm?.patientId ?? '',
          title: ctrlTitle, description: ctrlDesc || undefined,
          frequencyHours: Number(ctrlFreq),
          firstDue: ctrlFirstDue,
          doctorId: ctrlDoctorId || undefined,
          nurseId: ctrlNurseId || undefined,
          createdBy: user?.id ?? '',
        })
        setControls((prev) => [...prev, created])
      } else {
        const doc = doctors.find((d) => d.id === ctrlDoctorId)
        const nur = nurses.find((n) => n.id === ctrlNurseId)
        const newCtrl: PeriodicControlDTO = {
          id: 'pc-' + Date.now(), admissionId: selectedAdmissionId,
          patientId: adm?.patientId ?? '', patientName: adm?.patientName ?? null,
          title: ctrlTitle, description: ctrlDesc || null,
          frequencyHours: Number(ctrlFreq), nextDue: ctrlFirstDue,
          doctorId: ctrlDoctorId || null, doctorName: doc?.name ?? null,
          nurseId: ctrlNurseId || null, nurseName: nur?.name ?? null,
          createdBy: user?.id ?? '', active: true, createdAt: new Date().toISOString(),
        }
        setControls((prev) => [...prev, newCtrl])
      }
      toast.success(t('admin:inpatient.controls.successToast'))
      setShowControlForm(false)
      setCtrlTitle(''); setCtrlDesc(''); setCtrlFreq('6'); setCtrlFirstDue('')
      setCtrlDoctorId(''); setCtrlNurseId('')
    } catch {
      toast.error(t('admin:inpatient.controls.errorToast'))
    } finally {
      setSavingCtrl(false)
    }
  }

  // ──────────────────────────────────────────────────────
  // Room board grouping
  // ──────────────────────────────────────────────────────
  const wings = Array.from(new Set(rooms.map((r) => r.wing ?? 'Other'))).sort()

  // Available rooms for admit form
  const availableRooms = rooms.filter((r) => r.status === 'available')

  // Patient search filter
  const filteredPatients = admitPatientSearch
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(admitPatientSearch.toLowerCase()) ||
        p.mrn.toLowerCase().includes(admitPatientSearch.toLowerCase())
      ).slice(0, 8)
    : []

  const tabs: { key: Tab; label: string }[] = [
    { key: 'roomBoard',        label: t('admin:inpatient.tabs.roomBoard') },
    { key: 'admissions',       label: t('admin:inpatient.tabs.admissions') },
    { key: 'admit',            label: t('admin:inpatient.tabs.admit') },
    { key: 'periodicControls', label: t('admin:inpatient.tabs.periodicControls') },
  ]

  if (loading) {
    return <p className="text-xs text-slate-500 p-6">{t('common:loading')}</p>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('admin:inpatient.title')}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('admin:inpatient.subtitle')}
        </p>
      </header>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {rooms.filter((r) => r.status === 'available').length} {t('admin:inpatient.roomBoard.available')}
        </span>
        <span className="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {rooms.filter((r) => r.status === 'occupied').length} {t('admin:inpatient.roomBoard.occupied')}
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {rooms.filter((r) => r.status === 'maintenance').length} {t('admin:inpatient.roomBoard.maintenance')}
        </span>
        <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          {admissions.length} active admissions
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              tab === key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ────────────────────── TAB: Room Board ────────────────────── */}
      {tab === 'roomBoard' && (
        <div className="space-y-5">
          {wings.length === 0 ? (
            <p className="text-xs text-slate-500">{t('admin:inpatient.roomBoard.noRooms')}</p>
          ) : (
            wings.map((wing) => {
              const wingRooms = rooms.filter((r) => (r.wing ?? 'Other') === wing)
              return (
                <section key={wing} className="rounded-3xl bg-white p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('admin:inpatient.roomBoard.wing')} {wing}
                    <span className="ml-2 text-slate-400">· {t('admin:inpatient.roomBoard.floor')} {wingRooms[0]?.floor}</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {wingRooms.map((room) => (
                      <div
                        key={room.id}
                        className={`relative rounded-2xl border-2 p-3 transition ${roomStatusColor(room.status)}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-base font-bold text-slate-800 dark:text-slate-100">{room.number}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold ${roomTypeBadge(room.type)}`}>
                            {t(`admin:inpatient.roomTypes.${room.type}`)}
                          </span>
                        </div>
                        {room.currentPatientName ? (
                          <p className="mt-1 truncate text-[0.65rem] text-slate-600 dark:text-slate-300">{room.currentPatientName}</p>
                        ) : (
                          <p className="mt-1 text-[0.65rem] text-slate-400 dark:text-slate-500">{t(`admin:inpatient.roomBoard.${room.status}`)}</p>
                        )}
                        {room.notes && (
                          <p className="mt-0.5 truncate text-[0.6rem] text-slate-400 italic">{room.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      )}

      {/* ────────────────────── TAB: Admissions ────────────────────── */}
      {tab === 'admissions' && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          {admissions.length === 0 ? (
            <p className="text-xs text-slate-500">{t('admin:inpatient.admissions.noAdmissions')}</p>
          ) : (
            <div className="space-y-3">
              {admissions.map((adm) => {
                const daysIn = Math.floor((Date.now() - new Date(adm.admittedAt).getTime()) / 86400000)
                return (
                  <div key={adm.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-700/40 dark:ring-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{adm.patientName}</p>
                          <Badge variant={adm.admissionType === 'emergency' ? 'error' : adm.admissionType === 'transfer' ? 'warning' : 'info'}>
                            {t(`admin:inpatient.admit.types.${adm.admissionType}`)}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {adm.roomNumber && (
                            <span>🛏 {t('admin:inpatient.admissions.room')}: <span className="font-medium text-slate-700 dark:text-slate-200">{adm.roomNumber}</span></span>
                          )}
                          {adm.primaryDoctorName && (
                            <span>👨‍⚕️ {adm.primaryDoctorName}</span>
                          )}
                          {adm.diagnosis && (
                            <span>🔬 {adm.diagnosis}</span>
                          )}
                          <span>📅 Day {daysIn === 0 ? 1 : daysIn + 1}</span>
                          {adm.expectedDischarge && (
                            <span>🗓 Exp. discharge: {adm.expectedDischarge}</span>
                          )}
                        </div>
                        {adm.notes && (
                          <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-500">{adm.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setSelectedAdmissionId(adm.id); setTab('periodicControls') }}
                          className="rounded-xl border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
                        >
                          {t('admin:inpatient.admissions.manageControls')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDischarge(adm)}
                          className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                        >
                          {t('admin:inpatient.admissions.discharge')}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ────────────────────── TAB: Admit Patient ────────────────────── */}
      {tab === 'admit' && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('admin:inpatient.admit.heading')}
          </h3>
          <form onSubmit={(e) => void handleAdmit(e)} className="space-y-4">

            {/* Patient search */}
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('admin:inpatient.admit.patientLabel')} *
              </label>
              <input
                type="text"
                value={admitPatientSearch}
                onChange={(e) => { setAdmitPatientSearch(e.target.value); setAdmitPatientId('') }}
                placeholder={t('admin:inpatient.admit.patientPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-700"
              />
              {filteredPatients.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
                  {filteredPatients.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { setAdmitPatientId(p.id); setAdmitPatientSearch(`${p.name} (${p.mrn})`) }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                        <span className="ml-2 text-slate-400">{p.mrn}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {admitPatientId && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">✓ Patient selected</p>
              )}
            </div>

            {/* Room & Doctor row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('admin:inpatient.admit.roomLabel')} *
                </label>
                <select
                  required
                  value={admitRoomId}
                  onChange={(e) => setAdmitRoomId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="">{t('admin:inpatient.admit.selectRoom')}</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number} — {t(`admin:inpatient.roomTypes.${r.type}`)} (Floor {r.floor}{r.wing ? ', Wing ' + r.wing : ''})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('admin:inpatient.admit.doctorLabel')}
                </label>
                <select
                  value={admitDoctorId}
                  onChange={(e) => setAdmitDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="">{t('admin:inpatient.admit.selectDoctor')}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type & Expected discharge */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('admin:inpatient.admit.typeLabel')} *
                </label>
                <select
                  value={admitType}
                  onChange={(e) => setAdmitType(e.target.value as typeof admitType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="elective">{t('admin:inpatient.admit.types.elective')}</option>
                  <option value="emergency">{t('admin:inpatient.admit.types.emergency')}</option>
                  <option value="transfer">{t('admin:inpatient.admit.types.transfer')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('admin:inpatient.admit.expectedDischargeLabel')}
                </label>
                <input
                  type="date"
                  value={admitExpectedDischarge}
                  onChange={(e) => setAdmitExpectedDischarge(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Diagnosis & Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('admin:inpatient.admit.diagnosisLabel')}
              </label>
              <input
                type="text"
                value={admitDiagnosis}
                onChange={(e) => setAdmitDiagnosis(e.target.value)}
                placeholder={t('admin:inpatient.admit.diagnosisPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('admin:inpatient.admit.notesLabel')}
              </label>
              <textarea
                rows={2}
                value={admitNotes}
                onChange={(e) => setAdmitNotes(e.target.value)}
                placeholder={t('admin:inpatient.admit.notesPlaceholder')}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={admitting || !admitPatientId || !admitRoomId}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {admitting ? t('admin:inpatient.admit.submitting') : t('admin:inpatient.admit.submit')}
            </button>
          </form>
        </section>
      )}

      {/* ────────────────────── TAB: Periodic Controls ────────────────────── */}
      {tab === 'periodicControls' && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('admin:inpatient.controls.selectAdmission')}
            </label>
            {admissions.length === 0 ? (
              <p className="text-xs text-slate-500">{t('admin:inpatient.controls.noAdmissions')}</p>
            ) : (
              <select
                value={selectedAdmissionId}
                onChange={(e) => { setSelectedAdmissionId(e.target.value); setShowControlForm(false) }}
                className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="">— {t('admin:inpatient.controls.selectAdmission')} —</option>
                {admissions.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.patientName} · Room {adm.roomNumber ?? '—'} · Day {Math.max(1, Math.floor((Date.now() - new Date(adm.admittedAt).getTime()) / 86400000) + 1)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedAdmissionId && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('admin:inpatient.controls.heading')}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowControlForm((v) => !v)}
                  className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  {t('admin:inpatient.controls.addControl')}
                </button>
              </div>

              {/* Add control form */}
              {showControlForm && (
                <form onSubmit={(e) => void handleSaveControl(e)} className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/10">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-indigo-900 dark:text-indigo-300">
                        {t('admin:inpatient.controls.titleLabel')} *
                      </label>
                      <input
                        required
                        type="text"
                        value={ctrlTitle}
                        onChange={(e) => setCtrlTitle(e.target.value)}
                        placeholder={t('admin:inpatient.controls.titlePlaceholder')}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-indigo-900 dark:text-indigo-300">
                        {t('admin:inpatient.controls.frequencyLabel')} *
                      </label>
                      <input
                        required
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={ctrlFreq}
                        onChange={(e) => setCtrlFreq(e.target.value)}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-indigo-900 dark:text-indigo-300">
                      {t('admin:inpatient.controls.descLabel')}
                    </label>
                    <textarea
                      rows={2}
                      value={ctrlDesc}
                      onChange={(e) => setCtrlDesc(e.target.value)}
                      placeholder={t('admin:inpatient.controls.descPlaceholder')}
                      className="w-full resize-none rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-indigo-900 dark:text-indigo-300">
                        {t('admin:inpatient.controls.firstDueLabel')} *
                      </label>
                      <input
                        required
                        type="datetime-local"
                        value={ctrlFirstDue}
                        onChange={(e) => setCtrlFirstDue(e.target.value)}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-indigo-900 dark:text-indigo-300">
                        {t('admin:inpatient.controls.doctorLabel')}
                      </label>
                      <select
                        value={ctrlDoctorId}
                        onChange={(e) => setCtrlDoctorId(e.target.value)}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">{t('admin:inpatient.controls.selectStaff')}</option>
                        {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-indigo-900 dark:text-indigo-300">
                      {t('admin:inpatient.controls.nurseLabel')}
                    </label>
                    <select
                      value={ctrlNurseId}
                      onChange={(e) => setCtrlNurseId(e.target.value)}
                      className="w-full max-w-xs rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">{t('admin:inpatient.controls.selectStaff')}</option>
                      {nurses.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" disabled={savingCtrl} className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                      {savingCtrl ? t('admin:inpatient.controls.submitting') : t('admin:inpatient.controls.submit')}
                    </button>
                    <button type="button" onClick={() => setShowControlForm(false)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                      {t('common:actions.cancel')}
                    </button>
                  </div>
                </form>
              )}

              {/* Controls list */}
              {controls.length === 0 ? (
                <p className="text-xs text-slate-500">{t('admin:inpatient.controls.noControls')}</p>
              ) : (
                <div className="space-y-2">
                  {controls.map((ctrl) => {
                    const due = new Date(ctrl.nextDue)
                    const overdue = due < new Date()
                    return (
                      <div key={ctrl.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-slate-700/40 dark:ring-slate-700">
                        <div className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${overdue ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{ctrl.title}</p>
                          {ctrl.description && <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">{ctrl.description}</p>}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.65rem] text-slate-400">
                            <span>{t('admin:inpatient.controls.frequency', { h: ctrl.frequencyHours })}</span>
                            <span className={overdue ? 'font-medium text-rose-500' : ''}>
                              {t('admin:inpatient.controls.nextDue')}: {due.toLocaleString()}
                            </span>
                            {ctrl.doctorName && <span>👨‍⚕️ {ctrl.doctorName}</span>}
                            {ctrl.nurseName && <span>👩‍⚕️ {ctrl.nurseName}</span>}
                          </div>
                        </div>
                        <Badge variant="success">{t('admin:inpatient.controls.active')}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
