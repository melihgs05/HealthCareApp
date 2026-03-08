import { useTranslation } from 'react-i18next'
import { usePatientData } from '../context/PatientDataContext'

export function ActivityPage() {
  const { activity } = usePatientData()
  const { t } = useTranslation('portal')

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('activity.title')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('activity.subtitle')}
        </p>
      </header>

      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <ol className="space-y-3 text-xs">
          {activity.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-sky-50 text-[0.65rem] font-medium text-sky-700 ring-1 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700">
                <div className="flex h-full items-center justify-center">
                  {item.type === 'Login'
                    ? 'LG'
                    : item.type === 'Message'
                    ? 'MS'
                    : item.type === 'Appointment'
                    ? 'AP'
                    : 'DC'}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {item.date} · {item.time} · {item.type}
                </p>
                <p className="mt-0.5 text-slate-800 dark:text-slate-200">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

