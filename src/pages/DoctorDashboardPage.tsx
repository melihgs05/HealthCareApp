import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Badge, Avatar } from '../components/ui'

type DoctorAppointment = {
  id: string
  time: string
  patient: string
  reason: string
  room: string
}

type PatientRow = {
  id: string
  name: string
  mrn: string
  lastVisit: string
  nextAppt: string
  status: 'Active' | 'Follow-up' | 'New'
}

type InboxMessage = {
  id: string
  from: string
  subject: string
  time: string
  read: boolean
}

const todayAppointments: DoctorAppointment[] = [
  { id: 'd-appt-001', time: '09:00', patient: 'Alex Johnson', reason: 'Annual physical', room: 'Room 3A' },
  { id: 'd-appt-002', time: '10:30', patient: 'Maria Gomez', reason: 'Hypertension follow-up', room: 'Room 2B' },
  { id: 'd-appt-003', time: '13:15', patient: 'James Lee', reason: 'Medication review', room: 'Room 1C' },
  { id: 'd-appt-004', time: '14:45', patient: 'Sara Kim', reason: 'Diabetes check-in', room: 'Room 3A' },
]

const patientList: PatientRow[] = [
  { id: 'p-001', name: 'Alex Johnson', mrn: 'MRN-001', lastVisit: 'Jun 10, 2025', nextAppt: 'Jul 14, 2025', status: 'Active' },
  { id: 'p-002', name: 'Maria Gomez', mrn: 'MRN-002', lastVisit: 'Jun 3, 2025', nextAppt: 'Jun 30, 2025', status: 'Follow-up' },
  { id: 'p-003', name: 'James Lee', mrn: 'MRN-003', lastVisit: 'May 28, 2025', nextAppt: 'Jul 1, 2025', status: 'Active' },
  { id: 'p-004', name: 'Sara Kim', mrn: 'MRN-004', lastVisit: '—', nextAppt: 'Jun 25, 2025', status: 'New' },
  { id: 'p-005', name: 'David Osei', mrn: 'MRN-005', lastVisit: 'Jun 18, 2025', nextAppt: 'Jul 22, 2025', status: 'Active' },
]

const inboxMessages: InboxMessage[] = [
  { id: 'im-001', from: 'Alex Johnson', subject: 'Question about Lisinopril dosage', time: '08:42', read: false },
  { id: 'im-002', from: 'James Lee', subject: 'Refill request — Metformin', time: 'Yesterday', read: false },
  { id: 'im-003', from: 'Maria Gomez', subject: 'Blood pressure readings for this week', time: '2 days ago', read: true },
  { id: 'im-004', from: 'David Osei', subject: 'Follow-up on lab results', time: '3 days ago', read: true },
]

const panelSummaries = [
  { key: 'patientsToday', value: '8', hint: 'patientsTodayHint', hintVars: { new: 3, returning: 5 } },
  { key: 'newMessages', value: '4', hint: 'newMessagesHint', hintVars: {} },
  { key: 'resultsToSign', value: '2', hint: 'resultsToSignHint', hintVars: {} },
]

export function DoctorDashboardPage() {
  const { t } = useTranslation('doctor')
  const [patientSearch, setPatientSearch] = useState('')

  const filteredPatients = patientList.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearch.toLowerCase())
  )

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
          <ul className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-700">
            {todayAppointments.map((appt) => (
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
                  onClick={() => toast.success(`Opening chart — ${appt.patient}`)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.7rem] font-medium text-emerald-900 hover:bg-white dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                >
                  {t('doctor:dashboard.openChart')}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-3xl bg-white p-4 shadow-sm shadow-emerald-100 ring-1 ring-emerald-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-emerald-900/40">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('doctor:dashboard.quickActionsTitle')}
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {[
                { key: 'addNote', color: 'bg-sky-50 text-sky-900 border-sky-100 hover:bg-white dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800' },
                { key: 'ePrescribe', color: 'bg-emerald-50 text-emerald-900 border-emerald-100 hover:bg-white dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
                { key: 'orderLab', color: 'bg-indigo-50 text-indigo-900 border-indigo-100 hover:bg-white dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800' },
              ].map(({ key, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toast.success(t(`doctor:dashboard.${key}`))}
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
              {inboxMessages.map((msg) => (
                <li key={msg.id} className={`flex items-start gap-2 py-2 ${!msg.read ? 'opacity-100' : 'opacity-60'}`}>
                  <Avatar name={msg.from} size="sm" colorClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{msg.from}</p>
                    <p className="truncate text-slate-600 dark:text-slate-400">{msg.subject}</p>
                  </div>
                  <span className="flex-shrink-0 text-[0.65rem] text-slate-400 dark:text-slate-500">{msg.time}</span>
                </li>
              ))}
            </ul>
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
                    <Badge variant={p.status === 'Active' ? 'success' : p.status === 'New' ? 'info' : 'warning'}>
                      {p.status}
                    </Badge>
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

