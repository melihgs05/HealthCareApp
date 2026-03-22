import { useTranslation } from 'react-i18next'
import { usePatientData } from '../context/PatientDataContext'
import { Badge, LoadingSpinner } from '../components/ui'

export function MedicalSummaryPage() {
  const { profile, medications, recentResults, isLoading, error } = usePatientData()
  const { t } = useTranslation(['portal', 'common'])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('portal:medicalSummary.title')}
        </h2>
        {error && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t('common:errors.generic')}</p>
        )}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('portal:medicalSummary.subtitle')}
        </p>
      </header>

      {medications.length === 0 && recentResults.length === 0 && !error && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-900/20">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-xs text-sky-700 dark:text-sky-300">
            {t('portal:medicalSummary.noDataNotice')}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr),minmax(0,1.3fr)]">
        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('portal:medicalSummary.profileTitle')}
          </h3>
          {!profile.id ? (
            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              {t('portal:medicalSummary.noProfile')}
            </div>
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <dt className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('portal:medicalSummary.nameLabel')}
                </dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {profile.name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('portal:medicalSummary.dobLabel')}
                </dt>
                <dd className="mt-1">{profile.dob || '—'}</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('portal:medicalSummary.mrnLabel')}
                </dt>
                <dd className="mt-1">{profile.mrn || '—'}</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('portal:medicalSummary.insuranceLabel')}
                </dt>
                <dd className="mt-1">{profile.insurance || '—'}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('portal:medicalSummary.medicationsTitle')}
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {medications.length === 0 ? (
              <li className="rounded-2xl bg-slate-50 px-3 py-3 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                {t('portal:medicalSummary.noMedications')}
              </li>
            ) : medications.map((med) => (
              <li
                key={med.id}
                className="flex items-start justify-between rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {med.name}
                  </p>
                  <p className="mt-0.5">{med.dosage}</p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-500 dark:text-slate-400">
                    {med.schedule}
                  </p>
                </div>
                {med.active && (
                  <Badge variant="success">{t('common:status.active')}</Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('portal:medicalSummary.resultsTitle')}
        </h3>
        <ul className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-700">
          {recentResults.length === 0 ? (
            <li className="rounded-2xl bg-slate-50 px-3 py-3 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              {t('portal:medicalSummary.noResults')}
            </li>
          ) : recentResults.map((result) => (
            <li key={result.id} className="flex items-start gap-3 py-2.5">
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />
              <div className="flex-1">
                <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {result.date} · {result.type}
                </p>
                <p className="mt-1 text-slate-800 dark:text-slate-200">{result.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

