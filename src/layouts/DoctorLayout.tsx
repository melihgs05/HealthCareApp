import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { AppNavbar } from '../components/ui/AppNavbar'

export function DoctorLayout() {
  const { user } = useAuth()
  const { t } = useTranslation(['doctor', 'common'])

  const navItems = [
    { to: '/doctor', label: t('doctor:nav.today') },
    { to: '/doctor/settings', label: t('common:settings.accountSettings') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNavbar />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-0 lg:gap-6 px-0 py-0 lg:px-4 lg:pt-20 lg:pb-6">
        <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl bg-white p-5 shadow-md shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700 md:flex self-start sticky top-[84px]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-semibold text-white">
              {user?.name ? user.name.split(' ').filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('') : 'CB'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('doctor:layout.appTitle')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('doctor:layout.appSubtitle')}
              </p>
            </div>
          </Link>

          <nav className="mt-8 flex-1 space-y-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  [
                    'flex items-center justify-between rounded-2xl px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100',
                  ].join(' ')
                }
              >
                <span>{item.label}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-600" />
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="mb-4 flex flex-col gap-3 rounded-none lg:rounded-3xl bg-emerald-900 px-5 py-4 text-emerald-50 shadow-md shadow-emerald-200/60 dark:shadow-emerald-900/30 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-200">
                {t('doctor:layout.headerLabel')}
              </p>
              <h1 className="mt-1 text-lg font-semibold">
                {user?.name ?? 'Doctor'}
              </h1>
              <p className="mt-1 text-xs text-emerald-100/90 sm:text-sm">
                {t('doctor:layout.headerSubtitle')}
              </p>
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

