import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { AppNavbar } from '../components/ui/AppNavbar'

function ShieldIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  )
}

export function AdminLayout() {
  const { user } = useAuth()
  const { t } = useTranslation(['admin', 'common'])

  const navItems: { to: string; label: string; icon?: ReactNode }[] = [
    { to: '/admin', label: t('admin:nav.overview') },
    { to: '/admin/personnel', label: 'Personnel' },
    { to: '/admin/audit-log', label: 'Audit Log', icon: <ShieldIcon /> },
    { to: '/admin/site-settings', label: t('admin:nav.siteSettings') },
    { to: '/admin/settings', label: t('common:settings.accountSettings') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNavbar />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-0 md:gap-6 px-0 pt-16 pb-0 md:px-4 md:pt-20 md:pb-6">
        <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl bg-white p-5 shadow-md shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700 md:flex self-start sticky top-[84px]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-600 text-sm font-semibold text-white">
              {user?.name ? user.name.split(' ').filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('') : 'CB'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('admin:layout.appTitle')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('admin:layout.appSubtitle')}
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
                      ? 'bg-slate-900 text-slate-50 dark:bg-slate-600 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100',
                  ].join(' ')
                }
              >
                <span className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-600" />
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="mb-4 flex flex-col gap-3 rounded-none lg:rounded-3xl bg-slate-900 px-5 py-4 text-slate-50 shadow-md shadow-slate-300/60 dark:shadow-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">
                {t('admin:layout.headerLabel')}
              </p>
              <h1 className="mt-1 text-lg font-semibold">
                {user?.name ?? 'Admin'}
              </h1>
              <p className="mt-1 text-xs text-slate-200/90 sm:text-sm">
                {t('admin:layout.headerSubtitle')}
              </p>
            </div>

          </header>

          {/* Mobile tab bar – visible only when sidebar is hidden */}
          <nav className="mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  [
                    'flex-shrink-0 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-600'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-700',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <section className="flex-1 px-4 pb-8 lg:px-0">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  )
}

