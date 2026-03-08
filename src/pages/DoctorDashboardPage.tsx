import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge, Avatar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { fetchTodaySchedule, fetchPatientList, fetchDoctorInbox } from '../api/doctorApi'
import type { DoctorScheduleDTO, PatientSummaryDTO, MessageDTO } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

const DEMO_APPTS: DoctorScheduleDTO[] = [
  { id: 'd-appt-001', time: '09:00', patient: 'Alex Johnson', patientId: 'demo-patient-001', reason: 'Annual physical', room: 'Room 3A', status: 'Upcoming', appointmentId: 'd-appt-001' },
  { id: 'd-appt-002', time: '10:30', patient: 'Maria Gomez', patientId: 'p-002', reason: 'Hypertension follow-up', room: 'Room 2B', status: 'Upcoming', appointmentId: 'd-appt-002' },
  { id: 'd-appt-003', time: '13:15', patient: 'James Lee', patientId: 'p-003', reason: 'Medication review', room: 'Room 1C', status: 'Upcoming', appointmentId: 'd-appt-003' },
  { id: 'd-appt-004', time: '14:45', patient: 'Sara Kim', patientId: 'p-004', reason: 'Diabetes check-in', room: 'Room 3A', status: 'Upcoming', appointmentId: 'd-appt-004' },
]

const DEMO_PATIENTS: PatientSummaryDTO[] = [
  { id: 'demo-patient-001', name: 'Alex Johnson', mrn: 'MRN-001', dob: '1985-04-12', insurance: 'BlueCross PPO', primaryDoctorId: 'demo-doctor-001', lastVisit: 'Jun 10, 2025', nextAppt: 'Jul 14, 2025', status: 'Active', activeMedicationCount: 2 },
  { id: 'p-002', name: 'Maria Gomez', mrn: 'MRN-002', dob: '1972-08-23', insurance: 'Aetna HMO', primaryDoctorId: 'demo-doctor-001', lastVisit: 'Jun 3, 2025', nextAppt: 'Jun 30, 2025', status: 'Follow-up', activeMedicationCount: 3 },
  { id: 'p-003', name: 'James Lee', mrn: 'MRN-003', dob: '1990-11-05', insurance: 'United PPO', primaryDoctorId: 'demo-doctor-001', lastVisit: 'May 28, 2025', nextAppt: 'Jul 1, 2025', status: 'Active', activeMedicationCount: 1 },
  { id: 'p-004', name: 'Sara Kim', mrn: 'MRN-004', dob: '2002-01-17', insurance: 'Student Plan', primaryDoctorId: 'demo-doctor-001', lastVisit: '—', nextAppt: 'Jun 25, 2025', status: 'Active', activeMedicationCount: 0 },
  { id: 'p-005', name: 'David Osei', mrn: 'MRN-005', dob: '1979-12-07', insurance: 'Medicare', primaryDoctorId: 'demo-doctor-001', lastVisit: 'Jun 18, 2025', nextAppt: 'Jul 22, 2025', status: 'Active', activeMedicationCount: 4 },
]

const DEMO_INBOX: MessageDTO[] = [
  { id: 'im-001', from: 'Alex Johnson', fromId: 'demo-patient-001', toId: 'demo-doctor-001', subject: 'Question about Lisinopril dosage', body: 'Hello Doctor, I have a question about my dosage.', date: new Date().toISOString(), read: false, parentId: null },
  { id: 'im-002', from: 'James Lee', fromId: 'p-003', toId: 'demo-doctor-001', subject: 'Refill request — Metformin', body: 'Please renew my prescription.', date: new Date(Date.now() - 86400000).toISOString(), read: false, parentId: null },
  { id: 'im-003', from: 'Maria Gomez', fromId: 'p-002', toId: 'demo-doctor-001', subject: 'Blood pressure readings', body: 'My readings this week are 130/85.', date: new Date(Date.now() - 2 * 86400000).toISOString(), read: true, parentId: null },
]

export function DoctorDashboardPage() {
  const { t } = useTranslation('doctor')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patientSearch, setPatientSearch] = useState('')
  const [todayAppointments, setTodayAppointments] = useState<DoctorScheduleDTO[]>([])
  const [patientList, setPatientList] = useState<PatientSummaryDTO[]>([])
  const [inboxMessages, setInboxMessages] = useState<MessageDTO[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setTodayAppointments(DEMO_APPTS)
      setPatientList(DEMO_PATIENTS)
      setInboxMessages(DEMO_INBOX)
      setLoadingSchedule(false)
      return
    }
    setLoadingSchedule(true)
    Promise.all([
      fetchTodaySchedule(user.id),
      fetchPatientList(user.id),
      fetchDoctorInbox(user.id),
    ]).then(([appts, patients, inbox]) => {
      setTodayAppointments(appts)
      setPatientList(patients)
      setInboxMessages(inbox)
    }).catch(() => toast.error('Failed to load dashboard data')).finally(() => setLoadingSchedule(false))
  }, [user])

  const filteredPatients = patientList.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearch.toLowerCase())
  )
  const unreadCount = inboxMessages.filter((m) => !m.read).length
  const panelSummaries = [
    { key: 'patientsToday', value: String(todayAppointments.length), hint: 'patientsTodayHint', hintVars: { new: todayAppointments.filter((a) => a.status === 'Upcoming').length, returning: todayAppointments.filter((a) => a.status !== 'Upcoming').length } },
    { key: 'newMessages', value: String(unreadCount), hint: 'newMessagesHint', hintVars: {} },
    { key: 'resultsToSign', value: '0', hint: 'resultsToSignHint', hintVars: {} },
  ]

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {panelSummaries.map((item) => (
          <div
            key={item.key}
            className="rounded-3xl bg-white p-4 shadow-sm shadow-emerald-100 ring-1 ring-emerald-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-emerald-900/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {t(`doctor:dashboard.${item.key}`)}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t(`doctor:dashboard.${item.hint}`, item.hintVars)}
            </p>
          </div>
        ))}
      </section>

      {/* Today's schedule + Quick actions */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1.1fr)]">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-emerald-100 ring-1 ring-emerald-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-emerald-900/40">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('doctor:dashboard.scheduleTitle')}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('doctor:dashboard.scheduleSubtitle')}
              </p>
            </div>
          </header>
          {loadingSchedule ? (
            <p className="mt-3 text-xs text-slate-500">Loading…</p>
          ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-700">
            {todayAppointments.length === 0 ? (
              <li className="py-3 text-slate-500">No appointments today.</li>
            ) : todayAppointments.map((appt) => (
              <li key={appt.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[0.65rem] font-semibold text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800">
                    {appt.time}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {appt.patient}
                    </p>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-400">{appt.reason}</p>
                    <p className="mt-0.5 text-[0.7rem] text-slate-500 dark:text-slate-500">
                      {appt.room}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => appt.patientId ? navigate(`/doctor/patients/${appt.patientId}/chart`) : toast.error('Patient ID not available')}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.7rem] font-medium text-emerald-900 hover:bg-white dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                >
                  {t('doctor:dashboard.openChart')}
                </button>
              </li>
            ))}
          </ul>
          )}
        </div>

        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-3xl bg-white p-4 shadow-sm shadow-emerald-100 ring-1 ring-emerald-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-emerald-900/40">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('doctor:dashboard.quickActionsTitle')}
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {[
                { key: 'addNote', color: 'bg-sky-50 text-sky-900 border-sky-100 hover:bg-white dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800', path: todayAppointments[0]?.patientId ? `/doctor/patients/${todayAppointments[0].patientId}/chart` : '/doctor/patients' },
                { key: 'ePrescribe', color: 'bg-emerald-50 text-emerald-900 border-emerald-100 hover:bg-white dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800', path: todayAppointments[0]?.patientId ? `/doctor/patients/${todayAppointments[0].patientId}/chart` : '/doctor/patients' },
                { key: 'orderLab', color: 'bg-indigo-50 text-indigo-900 border-indigo-100 hover:bg-white dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800', path: todayAppointments[0]?.patientId ? `/doctor/patients/${todayAppointments[0].patientId}/chart` : '/doctor/patients' },
              ].map(({ key, color, path }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate(path)}
                  className={`rounded-2xl border px-2 py-2.5 text-center text-[0.7rem] font-medium shadow-sm transition ${color}`}
                >
                  {t(`doctor:dashboard.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Inbox */}
          <div className="rounded-3xl bg-white p-4 shadow-sm shadow-emerald-100 ring-1 ring-emerald-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-emerald-900/40">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('doctor:dashboard.inboxTitle')}
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-700">
              {inboxMessages.length === 0 ? (
                <li className="py-2 text-slate-500">No messages.</li>
              ) : inboxMessages.slice(0, 4).map((msg) => (
                <li
                  key={msg.id}
                  className={`flex cursor-pointer items-start gap-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 ${!msg.read ? 'opacity-100' : 'opacity-60'}`}
                  onClick={() => navigate('/doctor/messages')}
                >
                  <Avatar name={msg.from} size="sm" colorClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{msg.from}</p>
                    <p className="truncate text-slate-600 dark:text-slate-400">{msg.subject}</p>
                  </div>
                  {!msg.read && <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />}
                </li>
              ))}
            </ul>
            {inboxMessages.length > 4 && (
              <button type="button" onClick={() => navigate('/doctor/messages')} className="mt-2 text-[0.7rem] text-emerald-600 hover:underline">
                View all {inboxMessages.length} messages →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Patient list */}
      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-emerald-100 ring-1 ring-emerald-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-emerald-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('doctor:dashboard.patientListTitle')}
          </h2>
          <input
            type="text"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder={t('doctor:dashboard.patientListSearch')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:w-56 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-600"
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5">{t('doctor:dashboard.patientNameCol')}</th>
                <th className="px-3 py-2.5">{t('doctor:dashboard.mrnCol')}</th>
                <th className="px-3 py-2.5">{t('doctor:dashboard.lastVisitCol')}</th>
                <th className="px-3 py-2.5">{t('doctor:dashboard.nextApptCol')}</th>
                <th className="px-3 py-2.5 text-right">{t('doctor:dashboard.statusCol')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p, i) => (
                <tr
                  key={p.id}
                  className={`text-slate-700 dark:text-slate-300 ${i % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800'}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={p.name} size="sm" colorClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{p.mrn}</td>
                  <td className="px-3 py-2.5">{p.lastVisit}</td>
                  <td className="px-3 py-2.5">{p.nextAppt}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant={p.status === 'Active' ? 'success' : p.status === 'Follow-up' ? 'info' : 'warning'}>
                        {p.status}
                      </Badge>
                      <button type="button" onClick={() => navigate(`/doctor/patients/${p.id}/chart`)} className="rounded-xl bg-emerald-600 px-2 py-0.5 text-[0.65rem] font-medium text-white hover:bg-emerald-700">
                        Chart
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

