import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { usePatientData } from '../context/PatientDataContext'
import { Badge } from '../components/ui'

export function AppointmentsPage() {
  const { appointments, requestAppointment } = usePatientData()
  const { t } = useTranslation(['portal', 'common'])
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [reason, setReason] = useState('')

  const handleRequest = (event: FormEvent) => {
    event.preventDefault()
    if (!reason.trim()) return
    requestAppointment(reason.trim())
    setReason('')
    toast.success(t('portal:appointments.requestSent'))
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('portal:appointments.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('portal:appointments.subtitle')}
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-[0.7rem] dark:bg-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={[
              'rounded-full px-3 py-1 transition',
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400',
            ].join(' ')}
          >
            {t('portal:appointments.listView')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={[
              'rounded-full px-3 py-1 transition',
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400',
            ].join(' ')}
          >
            {t('portal:appointments.calendarView')}
          </button>
        </div>
      </header>

      <form
        onSubmit={handleRequest}
        className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:appointments.requestTitle')}
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('portal:appointments.requestPlaceholder')}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-600"
          />
          <button
            type="submit"
            className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
          >
            {t('portal:appointments.submitRequest')}
          </button>
        </div>
      </form>

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">{t('portal:appointments.tableDate')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableTime')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableProvider')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableType')}</th>
                <th className="px-4 py-3">{t('portal:appointments.tableLocation')}</th>
                <th className="px-4 py-3 text-right">{t('portal:appointments.tableStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, index) => (
                <tr
                  key={appt.id}
                  className={[
                    'text-xs text-slate-700 dark:text-slate-300',
                    index % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800',
                  ].join(' ')}
                >
                  <td className="px-4 py-3">{appt.date}</td>
                  <td className="px-4 py-3">{appt.time}</td>
                  <td className="px-4 py-3">{appt.provider}</td>
                  <td className="px-4 py-3">{appt.type}</td>
                  <td className="px-4 py-3">{appt.location}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant={
                        appt.status === 'Upcoming'
                          ? 'info'
                          : appt.status === 'Completed'
                          ? 'success'
                          : 'error'
                      }
                    >
                      {appt.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('portal:appointments.calendarView')}
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {t('portal:appointments.calendarNote')}
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.7rem] text-slate-600">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-xl bg-sky-50 px-1.5 py-1 text-sky-900 ring-1 ring-sky-100 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-800"
              >
                <div className="font-semibold">{appt.date.slice(-2)}</div>
                <div className="mt-0.5">{appt.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

