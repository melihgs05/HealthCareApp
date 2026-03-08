import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { usePatientData } from '../context/PatientDataContext'
import { AppNavbar } from '../components/ui/AppNavbar'
import { Avatar } from '../components/ui/Avatar'

export function PortalLayout() {
  const { user, logout } = useAuth()
  const { profile, nextAppointment } = usePatientData()
  const { t } = useTranslation(['portal', 'common'])

  const navItems = [
    { to: '/portal', label: t('portal:nav.overview') },
    { to: '/portal/appointments', label: t('portal:nav.appointments') },
    { to: '/portal/summary', label: t('portal:nav.medicalSummary') },
    { to: '/portal/history', label: t('portal:nav.history') },
    { to: '/portal/messages', label: t('portal:nav.messages') },
    { to: '/portal/visit-summary', label: t('portal:nav.visitSummary') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNavbar />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-0 lg:gap-6 px-0 py-0 lg:px-4 lg:pt-20 lg:pb-6">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl bg-white p-5 shadow-md shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700 md:flex self-start sticky top-[84px]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-600 text-sm font-semibold text-white">
              CB
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('portal:layout.appTitle')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('portal:layout.appSubtitle')}
              </p>
            </div>
          </Link>

          <nav className="mt-8 flex-1 space-y-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/portal'}
                className={({ isActive }) =>
                  [
                    'flex items-center justify-between rounded-2xl px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-sky-50 text-sky-900 dark:bg-sky-900/30 dark:text-sky-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100',
                  ].join(' ')
                }
              >
                <span>{item.label}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-600" />
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {t('portal:layout.helpTitle')}
            </p>
            <p className="mt-1">
              {t('portal:layout.helpText')}
              <span className="font-semibold"> (555) 123‑4567</span>.
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="mb-4 flex flex-col gap-3 rounded-none lg:rounded-3xl bg-sky-900 px-5 py-4 text-sky-50 shadow-md shadow-sky-200/60 dark:shadow-sky-900/30 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-200">
                {t('portal:layout.headerLabel')}
              </p>
              <h1 className="mt-1 text-lg font-semibold">
                {profile.name}
              </h1>
              <p className="mt-1 text-xs text-sky-100/90 sm:text-sm">
                MRN {profile.mrn} · {profile.primaryCareProvider}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm">
              {nextAppointment && (
                <div className="hidden rounded-2xl bg-sky-800/80 px-3 py-2 sm:block">
                  <p className="text-[0.7rem] uppercase tracking-wide text-sky-200">
                    {t('portal:layout.nextVisitLabel')}
                  </p>
                  <p className="text-sm font-medium">
                    {nextAppointment.date} · {nextAppointment.time}
                  </p>
                  <p className="text-[0.7rem] text-sky-100">
                    {nextAppointment.provider}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-full bg-sky-800/80 px-3 py-1.5">
                <Avatar name={user?.name ?? 'U'} size="sm" colorClass="bg-sky-700 text-white" />
                <div className="hidden text-left text-[0.7rem] sm:block">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sky-200">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="ml-1 rounded-full bg-sky-50 px-3 py-1 text-[0.7rem] font-medium text-sky-900 shadow-sm hover:bg-white"
                >
                  {t('common:actions.signOut')}
                </button>
              </div>
            </div>
          </header>

          <section className="flex-1 px-4 pb-8 lg:px-0">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  )
}

