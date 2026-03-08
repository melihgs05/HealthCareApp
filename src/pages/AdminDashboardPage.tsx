import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Avatar } from '../components/ui'

type UserRow = {
  id: string
  name: string
  role: 'Patient' | 'Doctor' | 'Admin'
  status: 'Active' | 'Inactive' | 'Suspended'
  lastLogin: string
}

type Integration = {
  key: string
  status: 'Online' | 'Offline' | 'Degraded'
}

const adminStats = [
  { key: 'activePatients', value: '1,284' },
  { key: 'activeClinicians', value: '46' },
  { key: 'appointmentsWeek', value: '312' },
  { key: 'messages24h', value: '189' },
]

const recentEvents = [
  'New clinician account created: Dr. Sophia Patel.',
  'Patient Alex Johnson logged in from a new device.',
  'Admin updated portal welcome content.',
  'System health check completed with no issues.',
  '2-factor authentication enforced for admin accounts.',
]

const userRows: UserRow[] = [
  { id: 'u-001', name: 'Alex Johnson', role: 'Patient', status: 'Active', lastLogin: 'Jun 20, 2025' },
  { id: 'u-002', name: 'Dr. Sarah Chen', role: 'Doctor', status: 'Active', lastLogin: 'Jun 20, 2025' },
  { id: 'u-003', name: 'Maria Gomez', role: 'Patient', status: 'Active', lastLogin: 'Jun 18, 2025' },
  { id: 'u-004', name: 'Dr. Sophia Patel', role: 'Doctor', status: 'Active', lastLogin: 'Jun 20, 2025' },
  { id: 'u-005', name: 'James Lee', role: 'Patient', status: 'Inactive', lastLogin: 'May 30, 2025' },
  { id: 'u-006', name: 'Admin User', role: 'Admin', status: 'Active', lastLogin: 'Jun 20, 2025' },
]

const integrations: Integration[] = [
  { key: 'integrationApi', status: 'Online' },
  { key: 'integrationDb', status: 'Online' },
  { key: 'integrationEhr', status: 'Degraded' },
  { key: 'integrationCms', status: 'Online' },
]

export function AdminDashboardPage() {
  const { t } = useTranslation('admin')
  const [userSearch, setUserSearch] = useState('')

  const filteredUsers = userRows.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <section className="grid gap-4 md:grid-cols-4">
        {adminStats.map((item) => (
          <div
            key={item.key}
            className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200 ring-1 ring-slate-200 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700"
          >
            <p className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t(`admin:dashboard.${item.key}`)}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* System activity + Integrations */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1.2fr)]">
        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200 ring-1 ring-slate-200 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('admin:dashboard.systemActivityTitle')}
          </h2>
          <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {recentEvents.map((event) => (
              <li
                key={event}
                className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
              >
                {event}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200 ring-1 ring-slate-200 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('admin:dashboard.integrationsTitle')}
          </h2>
          <ul className="mt-3 space-y-2.5 text-xs">
            {integrations.map((int) => (
              <li key={int.key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-700/50">
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {t(`admin:dashboard.${int.key}`)}
                </span>
                <Badge
                  variant={
                    int.status === 'Online' ? 'success' : int.status === 'Degraded' ? 'warning' : 'error'
                  }
                >
                  {t(`admin:dashboard.status${int.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* User management */}
      <section className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200 ring-1 ring-slate-200 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('admin:dashboard.userManagementTitle')}
          </h2>
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder={t('admin:dashboard.userSearchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 sm:w-56 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-600"
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5">{t('admin:dashboard.userNameCol')}</th>
                <th className="px-3 py-2.5">{t('admin:dashboard.userRoleCol')}</th>
                <th className="px-3 py-2.5">{t('admin:dashboard.userLastLoginCol')}</th>
                <th className="px-3 py-2.5 text-right">{t('admin:dashboard.userStatusCol')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className={`text-slate-700 dark:text-slate-300 ${i % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800'}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size="sm" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{u.role}</td>
                  <td className="px-3 py-2.5">{u.lastLogin}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Badge
                      variant={
                        u.status === 'Active' ? 'success' : u.status === 'Inactive' ? 'neutral' : 'error'
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

