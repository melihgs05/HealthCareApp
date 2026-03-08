import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { usePatientData } from '../context/PatientDataContext'
import { Badge } from '../components/ui'

export function DashboardPage() {
  const { profile, nextAppointment, medications, recentResults, messages } =
    usePatientData()
  const navigate = useNavigate()
  const { t } = useTranslation(['portal', 'common'])

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700 md:col-span-2">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('portal:dashboard.title')}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('portal:dashboard.subtitle')}
              </p>
            </div>
            <Badge variant="success">{t('portal:dashboard.statusGood')}</Badge>
          </header>

          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3 sm:text-sm">
            <div className="rounded-2xl bg-sky-50 px-3 py-3 dark:bg-sky-900/20">
              <dt className="text-xs font-medium text-sky-900 dark:text-sky-300">
                {t('portal:dashboard.pcpLabel')}
              </dt>
              <dd className="mt-1 text-sky-800 dark:text-sky-200">
                {profile.primaryCareProvider}
              </dd>
              <dd className="mt-1 text-[0.7rem] text-sky-700 dark:text-sky-400">
                {t('portal:dashboard.pcpHint')}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-700/50">
              <dt className="text-xs font-medium text-slate-900 dark:text-slate-200">
                {t('portal:dashboard.medsLabel')}
              </dt>
              <dd className="mt-1 text-slate-800 dark:text-slate-100">{medications.length}</dd>
              <dd className="mt-1 text-[0.7rem] text-slate-600 dark:text-slate-400">
                {t('portal:dashboard.medsHint')}
              </dd>
            </div>
            <div className="rounded-2xl bg-indigo-50 px-3 py-3 dark:bg-indigo-900/20">
              <dt className="text-xs font-medium text-indigo-900 dark:text-indigo-300">
                {t('portal:dashboard.messagesLabel')}
              </dt>
              <dd className="mt-1 text-indigo-800 dark:text-indigo-200">
                {unreadCount > 0
                  ? t('portal:dashboard.messagesUnread', { count: unreadCount })
                  : t('portal:dashboard.messagesCaughtUp')}
              </dd>
              <dd className="mt-1 text-[0.7rem] text-indigo-700 dark:text-indigo-400">
                {t('portal:dashboard.messagesHint')}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('portal:dashboard.nextApptTitle')}
            </h2>
          </header>

          {nextAppointment ? (
            <div className="mt-3 rounded-2xl bg-sky-50 px-3 py-3 text-xs text-sky-900 dark:bg-sky-900/20 dark:text-sky-200">
              <p className="text-[0.7rem] font-medium uppercase tracking-wide text-sky-700 dark:text-sky-400">
                {nextAppointment.type}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {nextAppointment.date} · {nextAppointment.time}
              </p>
              <p className="mt-1 text-sky-800 dark:text-sky-300">
                {nextAppointment.provider}
              </p>
              <p className="mt-1 text-[0.7rem] text-sky-700 dark:text-sky-400">
                {nextAppointment.location}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/portal/appointments')}
                  className="flex-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
                >
                  {t('portal:dashboard.viewDetails')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/portal/visit-summary')}
                  className="flex-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-white dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
                >
                  {t('portal:dashboard.addToCalendar')}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t('portal:dashboard.noAppointment')}
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)]">
        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('portal:dashboard.recentResultsTitle')}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('portal:dashboard.recentResultsSubtitle')}
            </span>
          </header>

          <ul className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-700">
            {recentResults.map((result) => (
              <li key={result.id} className="flex items-start gap-3 py-2.5">
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                <div className="flex-1">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {result.date} · {result.type}
                  </p>
                  <p className="mt-1 text-slate-800 dark:text-slate-200">{result.summary}</p>
                </div>
                <Badge
                  variant={
                    result.status === 'Normal'
                      ? 'success'
                      : result.status === 'Follow up'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {result.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('portal:dashboard.quickActionsTitle')}
            </h2>
          </header>

          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { navigate('/portal/appointments'); toast.success(t('portal:dashboard.requestVisitTitle')) }}
              className="flex flex-col items-start rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3 text-left text-sky-900 shadow-sm hover:bg-white dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-200 dark:hover:bg-sky-900/40"
            >
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-sky-700 dark:text-sky-400">
                {t('portal:dashboard.requestVisitTitle')}
              </span>
              <span className="mt-1 text-sm">
                {t('portal:dashboard.requestVisitDesc')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/portal/messages')}
              className="flex flex-col items-start rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-left text-indigo-900 shadow-sm hover:bg-white dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
            >
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                {t('portal:dashboard.messageDocTitle')}
              </span>
              <span className="mt-1 text-sm">
                {t('portal:dashboard.messageDocDesc')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/portal/summary')}
              className="flex flex-col items-start rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-left text-emerald-900 shadow-sm hover:bg-white dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            >
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {t('portal:dashboard.updateMedsTitle')}
              </span>
              <span className="mt-1 text-sm">
                {t('portal:dashboard.updateMedsDesc')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/portal/visit-summary')}
              className="flex flex-col items-start rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-left text-slate-900 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-700/30 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-400">
                {t('portal:dashboard.downloadSummaryTitle')}
              </span>
              <span className="mt-1 text-sm">
                {t('portal:dashboard.downloadSummaryDesc')}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

