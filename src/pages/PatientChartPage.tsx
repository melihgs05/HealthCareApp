import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui'
import {
  fetchPatientList,
  fetchPatientMedications,
  fetchPatientTestResults,
  fetchPatientNotes,
  createPatientNote,
  fetchPatientAppointmentHistory,
  createPrescription,
  orderLabTest,
  updateAppointmentStatus,
  addMedication,
  updateMedication,
  toggleMedicationActive,
  updateTestResultStatus,
} from '../api/doctorApi'
import type {
  PatientSummaryDTO,
  MedicationDTO,
  TestResultDTO,
  PatientNoteDTO,
  AppointmentDTO,
} from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

// Demo data fallback
const DEMO_PATIENTS: PatientSummaryDTO[] = [
  { id: 'demo-patient-001', name: 'Alex Johnson', mrn: 'MRN-000001', dob: '1985-04-12', insurance: 'BlueCross PPO', primaryDoctorId: 'demo-doctor-001', lastVisit: '2026-02-01', nextAppt: '2026-03-15', status: 'Active', activeMedicationCount: 2 },
  { id: 'p-002', name: 'Maria Gomez', mrn: 'MRN-000002', dob: '1972-08-23', insurance: 'Aetna HMO', primaryDoctorId: 'demo-doctor-001', lastVisit: '2026-01-20', nextAppt: '2026-03-10', status: 'Follow-up', activeMedicationCount: 3 },
  { id: 'p-003', name: 'James Lee', mrn: 'MRN-000003', dob: '1990-11-05', insurance: 'United PPO', primaryDoctorId: 'demo-doctor-001', lastVisit: '2025-12-14', nextAppt: '—', status: 'Active', activeMedicationCount: 1 },
]

const DEMO_MEDS: MedicationDTO[] = [
  { id: 'med-001', name: 'Lisinopril', dosage: '10 mg', schedule: 'Once daily', active: true, prescribedBy: 'Dr. Emily Carter' },
  { id: 'med-002', name: 'Metformin', dosage: '500 mg', schedule: 'Twice daily with meals', active: true, prescribedBy: 'Dr. Emily Carter' },
]

const DEMO_RESULTS: TestResultDTO[] = [
  {
    id: 'res-001', date: '2026-02-02', type: 'Complete Blood Count (CBC)', summary: 'All values within normal range.', status: 'Normal',
    items: [
      { name: 'WBC', value: '7.2', unit: 'K/µL', refMin: 4, refMax: 11, flag: 'N' },
      { name: 'RBC', value: '4.8', unit: 'M/µL', refMin: 4.2, refMax: 5.4, flag: 'N' },
      { name: 'Hemoglobin', value: '14.2', unit: 'g/dL', refMin: 12, refMax: 17, flag: 'N' },
      { name: 'Hematocrit', value: '42', unit: '%', refMin: 37, refMax: 51, flag: 'N' },
      { name: 'Platelets', value: '285', unit: 'K/µL', refMin: 150, refMax: 400, flag: 'N' },
    ],
  },
  {
    id: 'res-002', date: '2026-01-15', type: 'Comprehensive Metabolic Panel', summary: 'Glucose slightly elevated. Follow up recommended.', status: 'Follow up',
    items: [
      { name: 'Glucose', value: '112', unit: 'mg/dL', refMin: 70, refMax: 99, flag: 'H' },
      { name: 'BUN', value: '18', unit: 'mg/dL', refMin: 7, refMax: 25, flag: 'N' },
      { name: 'Creatinine', value: '1.0', unit: 'mg/dL', refMin: 0.6, refMax: 1.2, flag: 'N' },
      { name: 'Sodium', value: '140', unit: 'mEq/L', refMin: 136, refMax: 145, flag: 'N' },
      { name: 'Potassium', value: '4.1', unit: 'mEq/L', refMin: 3.5, refMax: 5.1, flag: 'N' },
      { name: 'HbA1c', value: '6.2', unit: '%', refMin: 0, refMax: 5.7, flag: 'H' },
    ],
  },
]

const DEMO_NOTES: PatientNoteDTO[] = [
  { id: 'note-001', content: 'Patient reports feeling better after medication adjustment.', authorId: 'demo-doctor-001', authorName: 'Dr. Emily Carter', visibility: ['doctor'], createdAt: '2026-02-01T10:00:00' },
]

const DEMO_APPTS: AppointmentDTO[] = [
  { id: 'appt-001', date: '2026-03-15', time: '10:30', provider: 'Dr. Emily Carter', providerId: 'demo-doctor-001', type: 'Annual physical', location: 'Suite 310', status: 'Upcoming' },
  { id: 'appt-002', date: '2026-02-01', time: '14:00', provider: 'Dr. Emily Carter', providerId: 'demo-doctor-001', type: 'Follow-up', location: 'Suite 310', status: 'Completed', notes: 'BP slightly elevated. Continue current meds.' },
]

type Tab = 'chart' | 'medications' | 'results' | 'notes' | 'appointments' | 'prescribe' | 'lab'

export function PatientChartPage() {
  const { patientId: paramId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [patients, setPatients] = useState<PatientSummaryDTO[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientSummaryDTO | null>(null)

  const [tab, setTab] = useState<Tab>('chart')
  const [medications, setMedications] = useState<MedicationDTO[]>([])
  const [results, setResults] = useState<TestResultDTO[]>([])
  const [notes, setNotes] = useState<PatientNoteDTO[]>([])
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([])
  const [loading, setLoading] = useState(false)

  // Note form
  const [noteContent, setNoteContent] = useState('')
  const [noteVisibility, setNoteVisibility] = useState<string[]>(['doctor'])
  const [savingNote, setSavingNote] = useState(false)

  // Medication management
  const [showAddMed, setShowAddMed] = useState(false)
  const [editMedId, setEditMedId] = useState<string | null>(null)
  const [medName, setMedName] = useState('')
  const [medDosage, setMedDosage] = useState('')
  const [medSchedule, setMedSchedule] = useState('')
  const [savingMed, setSavingMed] = useState(false)

  // Result expand / status revision
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [revisedStatuses, setRevisedStatuses] = useState<Record<string, TestResultDTO['status']>>({})
  const [savingResult, setSavingResult] = useState<string | null>(null)

  // Prescription form
  const [rxMedName, setRxMedName] = useState('')
  const [rxDosage, setRxDosage] = useState('')
  const [rxSchedule, setRxSchedule] = useState('')
  const [rxRefills, setRxRefills] = useState(0)
  const [rxPharmacy, setRxPharmacy] = useState('')
  const [rxInstructions, setRxInstructions] = useState('')
  const [savingRx, setSavingRx] = useState(false)

  // Lab order form
  const [labType, setLabType] = useState('')
  const [savingLab, setSavingLab] = useState(false)

  // Appointment update
  const [apptNotes, setApptNotes] = useState<Record<string, string>>({})
  const [updatingAppt, setUpdatingAppt] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setPatients(DEMO_PATIENTS)
      if (paramId) setSelectedPatient(DEMO_PATIENTS.find((p) => p.id === paramId) ?? DEMO_PATIENTS[0])
      else setSelectedPatient(DEMO_PATIENTS[0])
      return
    }
    fetchPatientList(user.id).then((list) => {
      setPatients(list)
      if (paramId) setSelectedPatient(list.find((p) => p.id === paramId) ?? list[0] ?? null)
      else setSelectedPatient(list[0] ?? null)
    }).catch(console.error)
  }, [user, paramId])

  useEffect(() => {
    if (!selectedPatient) return
    const load = async () => {
      setLoading(true)
      try {
        if (!isSupabaseConfigured) {
          setMedications(DEMO_MEDS)
          setResults(DEMO_RESULTS)
          setNotes(DEMO_NOTES)
          setAppointments(DEMO_APPTS)
          return
        }
        const [meds, res, nts, appts] = await Promise.all([
          fetchPatientMedications(selectedPatient.id),
          fetchPatientTestResults(selectedPatient.id),
          fetchPatientNotes(selectedPatient.id, 'doctor'),
          fetchPatientAppointmentHistory(selectedPatient.id, user!.id),
        ])
        setMedications(meds)
        setResults(res)
        setNotes(nts)
        setAppointments(appts)
        const initialNotes: Record<string, string> = {}
        appts.forEach((a) => { if (a.notes) initialNotes[a.id] = a.notes })
        setApptNotes(initialNotes)
      } catch (err) {
        toast.error('Failed to load patient data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [selectedPatient, user])

  const handleSaveNote = async (e: FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim() || !selectedPatient || !user) return
    setSavingNote(true)
    try {
      if (isSupabaseConfigured) {
        const note = await createPatientNote(selectedPatient.id, user.id, noteContent.trim(), noteVisibility)
        setNotes((prev) => [{ ...note, authorName: user.name ?? '' }, ...prev])
      } else {
        setNotes((prev) => [{
          id: `note-${Date.now()}`, content: noteContent.trim(), authorId: user.id,
          authorName: user.name ?? 'Doctor', visibility: noteVisibility, createdAt: new Date().toISOString(),
        }, ...prev])
      }
      setNoteContent('')
      toast.success('Note saved')
    } catch (err) {
      toast.error('Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  const handlePrescribe = async (e: FormEvent) => {
    e.preventDefault()
    if (!rxMedName || !rxDosage || !rxSchedule || !rxInstructions || !selectedPatient || !user) return
    setSavingRx(true)
    try {
      if (isSupabaseConfigured) {
        await createPrescription({
          doctorId: user.id, patientId: selectedPatient.id,
          medicationName: rxMedName, dosage: rxDosage, schedule: rxSchedule,
          refills: rxRefills, pharmacy: rxPharmacy, instructions: rxInstructions,
        })
      }
      toast.success(`Prescription sent: ${rxMedName} ${rxDosage}`)
      setRxMedName(''); setRxDosage(''); setRxSchedule(''); setRxRefills(0); setRxPharmacy(''); setRxInstructions('')
      if (isSupabaseConfigured) {
        const meds = await fetchPatientMedications(selectedPatient.id)
        setMedications(meds)
      } else {
        setMedications((prev) => [{ id: `med-${Date.now()}`, name: rxMedName, dosage: rxDosage, schedule: rxSchedule, active: true }, ...prev])
      }
    } catch (err) {
      toast.error('Failed to create prescription')
    } finally {
      setSavingRx(false)
    }
  }

  const handleOrderLab = async (e: FormEvent) => {
    e.preventDefault()
    if (!labType.trim() || !selectedPatient || !user) return
    setSavingLab(true)
    try {
      if (isSupabaseConfigured) {
        await orderLabTest({ patientId: selectedPatient.id, orderedBy: user.id, testType: labType.trim() })
      } else {
        setResults((prev) => [{ id: `res-${Date.now()}`, date: new Date().toISOString().slice(0,10), type: labType.trim(), summary: 'Ordered — awaiting results', status: 'In progress' }, ...prev])
      }
      toast.success(`Lab ordered: ${labType}`)
      setLabType('')
    } catch (err) {
      toast.error('Failed to order lab test')
    } finally {
      setSavingLab(false)
    }
  }

  const handleUpdateAppt = async (apptId: string, status: AppointmentDTO['status']) => {
    setUpdatingAppt(apptId)
    try {
      if (isSupabaseConfigured) {
        await updateAppointmentStatus(apptId, status, apptNotes[apptId])
      }
      setAppointments((prev) => prev.map((a) => a.id === apptId ? { ...a, status, notes: apptNotes[apptId] ?? a.notes } : a))
      toast.success('Appointment updated')
    } catch (err) {
      toast.error('Failed to update appointment')
    } finally {
      setUpdatingAppt(null)
    }
  }

  const startEditMed = (med: MedicationDTO) => {
    setEditMedId(med.id)
    setMedName(med.name)
    setMedDosage(med.dosage)
    setMedSchedule(med.schedule)
    setShowAddMed(false)
  }

  const startAddMed = () => {
    setEditMedId(null)
    setMedName('')
    setMedDosage('')
    setMedSchedule('')
    setShowAddMed(true)
  }

  const handleSaveMed = async (e: FormEvent) => {
    e.preventDefault()
    if (!medName.trim() || !medDosage.trim() || !medSchedule.trim() || !selectedPatient || !user) return
    setSavingMed(true)
    try {
      if (editMedId) {
        if (isSupabaseConfigured) {
          await updateMedication(editMedId, { name: medName.trim(), dosage: medDosage.trim(), schedule: medSchedule.trim() })
        }
        setMedications((prev) => prev.map((m) => m.id === editMedId ? { ...m, name: medName.trim(), dosage: medDosage.trim(), schedule: medSchedule.trim() } : m))
        toast.success('Medication updated')
        setEditMedId(null)
      } else {
        if (isSupabaseConfigured) {
          const med = await addMedication(selectedPatient.id, user.id, { name: medName.trim(), dosage: medDosage.trim(), schedule: medSchedule.trim() })
          setMedications((prev) => [med, ...prev])
        } else {
          setMedications((prev) => [{ id: `med-${Date.now()}`, name: medName.trim(), dosage: medDosage.trim(), schedule: medSchedule.trim(), active: true, prescribedBy: user.name ?? 'Doctor' }, ...prev])
        }
        toast.success('Medication added')
        setShowAddMed(false)
      }
      setMedName(''); setMedDosage(''); setMedSchedule('')
    } catch {
      toast.error('Failed to save medication')
    } finally {
      setSavingMed(false)
    }
  }

  const handleToggleMed = async (med: MedicationDTO) => {
    try {
      if (isSupabaseConfigured) await toggleMedicationActive(med.id, !med.active)
      setMedications((prev) => prev.map((m) => m.id === med.id ? { ...m, active: !m.active } : m))
      toast.success(med.active ? 'Medication deactivated' : 'Medication reactivated')
    } catch {
      toast.error('Failed to update medication')
    }
  }

  const handleReviseStatus = async (resultId: string) => {
    const newStatus = revisedStatuses[resultId]
    if (!newStatus) return
    setSavingResult(resultId)
    try {
      if (isSupabaseConfigured) await updateTestResultStatus(resultId, newStatus)
      setResults((prev) => prev.map((r) => r.id === resultId ? { ...r, status: newStatus } : r))
      toast.success('Result status updated')
    } catch {
      toast.error('Failed to update result')
    } finally {
      setSavingResult(null)
    }
  }

  const toggleNoteVisibility = (key: string) => {
    setNoteVisibility((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'chart', label: 'Overview' },
    { key: 'medications', label: 'Medications' },
    { key: 'results', label: 'Test Results' },
    { key: 'notes', label: 'Notes' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'prescribe', label: 'ePrescribe' },
    { key: 'lab', label: 'Order Lab' },
  ]

  const cardCls = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:ring-emerald-900/40'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/doctor')} className="text-xs text-emerald-700 hover:underline dark:text-emerald-400">
          ← Dashboard
        </button>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Patient Chart</h2>
      </div>

      {/* Patient selector */}
      <div className={cardCls}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Select Patient</label>
            <select
              value={selectedPatient?.id ?? ''}
              onChange={(e) => {
                const p = patients.find((pt) => pt.id === e.target.value)
                setSelectedPatient(p ?? null)
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.mrn}</option>
              ))}
            </select>
          </div>
          {selectedPatient && (
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
              <p>DOB: {selectedPatient.dob}</p>
              <p>MRN: {selectedPatient.mrn}</p>
              <p>Insurance: {selectedPatient.insurance ?? '—'}</p>
              <p>Active meds: {selectedPatient.activeMedicationCount}</p>
            </div>
          )}
        </div>
      </div>

      {!selectedPatient ? null : (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  'flex-shrink-0 rounded-xl px-3 py-1.5 mt-2 text-xs font-medium transition-colors',
                  tab === t.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && <p className="text-xs text-slate-500">Loading…</p>}

          {/* ── Overview ── */}
          {tab === 'chart' && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className={cardCls}>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Active Medications</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{medications.filter((m) => m.active).length}</p>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {medications.filter((m) => m.active).slice(0, 3).map((m) => <li key={m.id}>{m.name} {m.dosage}</li>)}
                </ul>
              </div>
              <div className={cardCls}>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Latest Results</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {results.slice(0, 3).map((r) => (
                    <li key={r.id} className="flex items-center justify-between">
                      <span>{r.type}</span>
                      <span className={r.status === 'Normal' ? 'text-emerald-600' : r.status === 'Follow up' ? 'text-amber-600' : 'text-slate-500'}>{r.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cardCls}>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Recent Notes</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {notes.slice(0, 2).map((n) => (
                    <li key={n.id} className="line-clamp-2">{n.content}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── Medications ── */}
          {tab === 'medications' && (
            <div className="space-y-3">
              <div className={cardCls}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Medications</h3>
                  <button type="button" onClick={startAddMed} className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                    + Add
                  </button>
                </div>
                {medications.length === 0 ? <p className="text-xs text-slate-500">No medications on file.</p> : (
                  <table className="min-w-full text-xs">
                    <thead><tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Dosage</th><th className="pb-2 pr-4">Schedule</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {medications.map((m) => (
                        <tr key={m.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-2 pr-4 font-medium">{m.name}</td>
                          <td className="py-2 pr-4">{m.dosage}</td>
                          <td className="py-2 pr-4">{m.schedule}</td>
                          <td className="py-2 pr-4"><Badge variant={m.active ? 'success' : 'neutral'}>{m.active ? 'Active' : 'Inactive'}</Badge></td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <button type="button" onClick={() => startEditMed(m)} className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[0.65rem] text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">Edit</button>
                              <button type="button" onClick={() => void handleToggleMed(m)} className={`rounded-lg border px-2 py-0.5 text-[0.65rem] ${m.active ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
                                {m.active ? 'Deactivate' : 'Reactivate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {(showAddMed || editMedId) && (
                <form onSubmit={(e) => void handleSaveMed(e)} className={cardCls + ' space-y-3'}>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{editMedId ? 'Edit Medication' : 'Add Medication'}</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Name</label>
                      <input value={medName} onChange={(e) => setMedName(e.target.value)} required placeholder="e.g. Lisinopril" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Dosage</label>
                      <input value={medDosage} onChange={(e) => setMedDosage(e.target.value)} required placeholder="e.g. 10 mg" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Schedule</label>
                      <input value={medSchedule} onChange={(e) => setMedSchedule(e.target.value)} required placeholder="e.g. Once daily" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingMed} className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      {savingMed ? 'Saving…' : editMedId ? 'Save Changes' : 'Add Medication'}
                    </button>
                    <button type="button" onClick={() => { setShowAddMed(false); setEditMedId(null) }} className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── Test Results ── */}
          {tab === 'results' && (
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Test Results</h3>
              {results.length === 0 ? <p className="text-xs text-slate-500">No results on file.</p> : (
                <div className="space-y-3">
                  {results.map((r) => {
                    const isExpanded = expandedResult === r.id
                    const currentStatus = revisedStatuses[r.id] ?? r.status
                    return (
                      <div key={r.id} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 overflow-hidden">
                        <div className="flex items-start justify-between p-3">
                          <div className="flex-1">
                            <button type="button" onClick={() => setExpandedResult(isExpanded ? null : r.id)} className="text-left">
                              <p className="text-xs font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400">{r.type} {isExpanded ? '▲' : '▼'}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{r.date}{r.orderedBy ? ` · Ordered by ${r.orderedBy}` : ''}</p>
                              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{r.summary}</p>
                            </button>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-3">
                            <Badge variant={currentStatus === 'Normal' ? 'success' : currentStatus === 'Follow up' ? 'warning' : 'info'}>{currentStatus}</Badge>
                            <div className="flex items-center gap-1">
                              <select
                                value={revisedStatuses[r.id] ?? r.status}
                                onChange={(e) => setRevisedStatuses((prev) => ({ ...prev, [r.id]: e.target.value as TestResultDTO['status'] }))}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[0.65rem] text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                              >
                                <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="Normal">Normal</option>
                                <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="Follow up">Follow up</option>
                                <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="In progress">In progress</option>
                              </select>
                              <button
                                type="button"
                                disabled={savingResult === r.id || (revisedStatuses[r.id] ?? r.status) === r.status}
                                onClick={() => void handleReviseStatus(r.id)}
                                className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[0.65rem] text-white hover:bg-emerald-700 disabled:opacity-40"
                              >
                                {savingResult === r.id ? '…' : 'Revise'}
                              </button>
                            </div>
                          </div>
                        </div>
                        {isExpanded && r.items && r.items.length > 0 && (
                          <div className="border-t border-slate-200 dark:border-slate-600 px-3 pb-3">
                            <p className="mt-2 mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lab Values</p>
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-[0.65rem] uppercase tracking-wide text-slate-400 text-left">
                                  <th className="pb-1 pr-3">Test</th>
                                  <th className="pb-1 pr-3">Value</th>
                                  <th className="pb-1 pr-3">Unit</th>
                                  <th className="pb-1 pr-3">Reference Range</th>
                                  <th className="pb-1">Flag</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {r.items.map((item) => (
                                  <tr key={item.name} className="text-slate-700 dark:text-slate-300">
                                    <td className="py-1 pr-3 font-medium">{item.name}</td>
                                    <td className={`py-1 pr-3 font-semibold ${item.flag === 'H' ? 'text-rose-600' : item.flag === 'L' ? 'text-amber-600' : ''}`}>{item.value}</td>
                                    <td className="py-1 pr-3 text-slate-500">{item.unit}</td>
                                    <td className="py-1 pr-3 text-slate-500">{item.refMin !== undefined && item.refMax !== undefined ? `${item.refMin}–${item.refMax}` : '—'}</td>
                                    <td className="py-1">
                                      {item.flag === 'H' && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">H</span>}
                                      {item.flag === 'L' && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">L</span>}
                                      {item.flag === 'N' && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {isExpanded && r.attachments && r.attachments.length > 0 && (
                          <div className="border-t border-slate-200 dark:border-slate-600 px-3 pb-3">
                            <p className="mt-2 mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Attachments</p>
                            <div className="flex flex-wrap gap-2">
                              {r.attachments.map((att) => (
                                <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                  {att.type === 'image' ? '🖼' : att.type === 'video' ? '🎬' : '📄'} {att.filename}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          {tab === 'notes' && (
            <div className="space-y-3">
              <form onSubmit={(e) => void handleSaveNote(e)} className={cardCls + ' space-y-3'}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add Note</h3>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Clinical observations, instructions…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Visible to:</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'doctor', label: 'Doctors' },
                      { key: 'admin', label: 'Admin' },
                      { key: 'patient', label: 'Patient' },
                      { key: 'lab', label: 'Laboratory' },
                      { key: 'nurse', label: 'Nurses' },
                      { key: 'desk', label: 'Front Desk' },
                    ]).map(({ key, label }) => (
                      <label key={key} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={noteVisibility.includes(key)}
                          onChange={() => toggleNoteVisibility(key)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={savingNote || !noteContent.trim() || noteVisibility.length === 0} className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {savingNote ? 'Saving…' : 'Save Note'}
                </button>
              </form>
              <div className={cardCls}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Note History</h3>
                {notes.length === 0 ? <p className="text-xs text-slate-500">No notes yet.</p> : (
                  <div className="space-y-2">
                    {notes.map((n) => {
                      const vis = Array.isArray(n.visibility) ? n.visibility : [n.visibility]
                      return (
                        <div key={n.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                          <div className="flex items-start justify-between mb-1 gap-2">
                            <span className="text-[0.7rem] text-slate-500">{new Date(n.createdAt).toLocaleDateString()} · {n.authorName}</span>
                            <div className="flex flex-wrap gap-1">
                              {vis.map((v) => (
                                <span key={v} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.6rem] font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-300 capitalize">{v}</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">{n.content}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Appointments ── */}
          {tab === 'appointments' && (
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Appointment History</h3>
              {appointments.length === 0 ? <p className="text-xs text-slate-500">No appointments.</p> : (
                <div className="space-y-3">
                  {appointments.map((a) => (
                    <div key={a.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{a.type}</p>
                          <p className="text-[0.7rem] text-slate-500">{a.date} at {a.time} · {a.location}</p>
                        </div>
                        <Badge variant={a.status === 'Completed' ? 'success' : a.status === 'Upcoming' ? 'info' : 'error'}>{a.status}</Badge>
                      </div>
                      <textarea
                        value={apptNotes[a.id] ?? ''}
                        onChange={(e) => setApptNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        placeholder="Appointment notes…"
                        rows={2}
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {(['Completed', 'Cancelled', 'No-show'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={updatingAppt === a.id || a.status === s}
                            onClick={() => void handleUpdateAppt(a.id, s)}
                            className={[
                              'rounded-xl border px-2 py-1 text-[0.7rem] font-medium transition',
                              a.status === s ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
                            ].join(' ')}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ePrescribe ── */}
          {tab === 'prescribe' && (
            <form onSubmit={(e) => void handlePrescribe(e)} className={cardCls + ' space-y-3'}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">E-Prescribe</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Medication Name</label>
                  <input value={rxMedName} onChange={(e) => setRxMedName(e.target.value)} required placeholder="e.g. Amlodipine" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Dosage</label>
                  <input value={rxDosage} onChange={(e) => setRxDosage(e.target.value)} required placeholder="e.g. 5 mg" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Schedule</label>
                  <input value={rxSchedule} onChange={(e) => setRxSchedule(e.target.value)} required placeholder="e.g. Once daily" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Refills</label>
                  <input type="number" min={0} max={12} value={rxRefills} onChange={(e) => setRxRefills(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Pharmacy (optional)</label>
                  <input value={rxPharmacy} onChange={(e) => setRxPharmacy(e.target.value)} placeholder="e.g. CVS Main St" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Instructions</label>
                  <input value={rxInstructions} onChange={(e) => setRxInstructions(e.target.value)} required placeholder="Take with food…" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                </div>
              </div>
              <button type="submit" disabled={savingRx} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {savingRx ? 'Sending…' : 'Send Prescription'}
              </button>
            </form>
          )}

          {/* ── Order Lab ── */}
          {tab === 'lab' && (
            <form onSubmit={(e) => void handleOrderLab(e)} className={cardCls + ' space-y-3'}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Order Lab Test</h3>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Test Type</label>
                <input value={labType} onChange={(e) => setLabType(e.target.value)} required placeholder="e.g. Complete Metabolic Panel, CBC, HbA1c…" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <button type="submit" disabled={savingLab} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {savingLab ? 'Ordering…' : 'Order Test'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
