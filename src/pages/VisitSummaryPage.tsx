import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { usePatientData } from '../context/PatientDataContext'
import { LoadingSpinner } from '../components/ui'

export function VisitSummaryPage() {
  const { profile, nextAppointment, recentResults, isLoading, error } = usePatientData()
  const { t } = useTranslation(['portal', 'common'])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  const handleDownload = () => {
    const lines = [
      'Visit Summary',
      `Patient: ${profile.name} (MRN ${profile.mrn})`,
      `Date: ${nextAppointment?.date ?? recentResults[0]?.date ?? ''}`,
      '',
      'Recent results:',
      ...recentResults.map(
        (r) => `- ${r.date} · ${r.type} · ${r.summary} [${r.status}]`,
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'visit-summary.txt'
    link.click()
    URL.revokeObjectURL(url)
    toast.success(t('portal:visitSummary.downloadSuccess'))
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('portal:visitSummary.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('portal:visitSummary.subtitle')}
          </p>
          {error && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t('common:errors.generic')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={recentResults.length === 0 && !nextAppointment}
          className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          {t('portal:visitSummary.downloadButton')}
        </button>
      </header>

      {!nextAppointment && recentResults.length === 0 && !error && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-900/20">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-xs text-sky-700 dark:text-sky-300">
            {t('portal:visitSummary.noDataNotice')}
          </p>
        </div>
      )}

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:visitSummary.patientTitle')}
        </h3>
        {!profile.id ? (
          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
            {t('portal:visitSummary.noPatientInfo')}
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              {profile.name || '—'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {t('portal:medicalSummary.mrnLabel')}: {profile.mrn || '—'} · {t('portal:medicalSummary.dobLabel')}: {profile.dob || '—'}
            </p>
          </>
        )}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:visitSummary.visitTitle')}
        </h3>
        {nextAppointment ? (
          <div className="mt-2 text-xs text-slate-700 dark:text-slate-300">
            <p>
              {nextAppointment.date} {t('portal:visitSummary.at')} {nextAppointment.time} {t('portal:dashboard.with')}{' '}
              {nextAppointment.provider}
            </p>
            <p className="mt-0.5">{nextAppointment.type}</p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
              {t('portal:visitSummary.locationLabel')}: {nextAppointment.location}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-center dark:bg-slate-700/50">
            <svg className="mx-auto mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('portal:visitSummary.noVisit')}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:visitSummary.resultsTitle')}
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
          {recentResults.length === 0 ? (
            <li className="rounded-2xl bg-slate-50 px-3 py-3 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              {t('portal:visitSummary.noResults')}
            </li>
          ) : recentResults.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
            >
              <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {r.date} · {r.type}
              </p>
              <p className="mt-0.5 dark:text-slate-200">{r.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

