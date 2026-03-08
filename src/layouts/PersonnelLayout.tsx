import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AppNavbar } from '../components/ui/AppNavbar'
import type { PersonnelSubrole } from '../api/types'

const subroleLabel: Record<PersonnelSubrole | string, string> = {
  lab: 'Laboratory',
  nurse: 'Nursing',
  desk: 'Front Desk',
}

const subroleColor: Record<PersonnelSubrole | string, string> = {
  lab: 'bg-indigo-600',
  nurse: 'bg-sky-600',
  desk: 'bg-amber-600',
}

function buildNavItems(subrole: PersonnelSubrole | undefined) {
  const items = [
    { to: '/staff', label: 'Dashboard' },
    { to: '/staff/tasks', label: 'My Tasks' },
    { to: '/staff/messages', label: 'Messages' },
  ]
  if (subrole === 'lab') {
    items.push({ to: '/staff/lab', label: 'Lab Orders' })
  }
  if (subrole === 'desk') {
    items.push({ to: '/staff/register', label: 'Register Patient' })
  }
  items.push({ to: '/staff/settings', label: 'Settings' })
  return items
}

export function PersonnelLayout() {
  const { user } = useAuth()
  const subrole = user?.subrole as PersonnelSubrole | undefined
  const navItems = buildNavItems(subrole)
  const dotColor = subroleColor[subrole ?? ''] ?? 'bg-slate-500'
  const roleLabel = subroleLabel[subrole ?? ''] ?? 'Healthcare Staff'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNavbar />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-0 md:gap-6 px-0 pt-16 pb-0 md:px-4 md:pt-20 md:pb-6">
        <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl bg-white p-5 shadow-md shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700 md:flex self-start sticky top-[84px]">
          <Link to="/" className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${dotColor} text-sm font-semibold text-white`}>
              {user?.name ? user.name.split(' ').filter(Boolean).slice(0,2).map((w: string) => w[0].toUpperCase()).join('') : 'ST'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Staff Portal</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
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
                      ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100',
                  ].join(' ')
                }
              >
                <span>{item.label}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-600" />
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/50">
            <p className="text-[0.65rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">Logged in as</p>
            <p className="mt-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">{user?.name ?? 'Staff Member'}</p>
            <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">{roleLabel}</p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className={`mb-4 flex flex-col gap-3 rounded-none lg:rounded-3xl ${dotColor} px-5 py-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Staff Portal · {roleLabel}</p>
              <h1 className="mt-1 text-lg font-semibold">{user?.name ?? 'Staff Member'}</h1>
              <p className="mt-1 text-xs text-white/80 sm:text-sm">
                {new Date().toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </header>

          {/* Mobile nav */}
          <nav className="mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  [
                    'flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1 px-4 pb-6 md:px-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
