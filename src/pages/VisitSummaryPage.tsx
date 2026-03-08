import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { usePatientData } from '../context/PatientDataContext'

export function VisitSummaryPage() {
  const { profile, nextAppointment, recentResults } = usePatientData()
  const { t } = useTranslation(['portal', 'common'])

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
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          {t('portal:visitSummary.downloadButton')}
        </button>
      </header>

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:visitSummary.patientTitle')}
        </h3>
        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          {profile.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          MRN {profile.mrn} · DOB {profile.dob}
        </p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:visitSummary.visitTitle')}
        </h3>
        {nextAppointment ? (
          <div className="mt-2 text-xs text-slate-700 dark:text-slate-300">
            <p>
              {nextAppointment.date} at {nextAppointment.time} {t('portal:dashboard.with')}{' '}
              {nextAppointment.provider}
            </p>
            <p className="mt-0.5">{nextAppointment.type}</p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
              {'Location'}: {nextAppointment.location}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t('portal:visitSummary.noVisit')}
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:visitSummary.resultsTitle')}
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
          {recentResults.map((r) => (
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

