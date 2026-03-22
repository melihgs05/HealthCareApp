import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Badge, Avatar, LoadingSpinner } from '../components/ui'
import { useDatabaseMode } from '../context/DatabaseModeContext'
import { useAuth } from '../context/AuthContext'
import { fetchAdminMetrics, fetchSystemEvents, fetchUsers, adminCreateUser, deleteUser } from '../api/adminApi'
import type { AdminMetricsDTO, SystemEventDTO, AdminUserDTO, PersonnelSubrole } from '../api/types'

type Integration = {
  key: string
  status: 'Online' | 'Offline' | 'Degraded'
}

const DEMO_METRICS: AdminMetricsDTO = {
  activePatients: 1284,
  activeClinicians: 46,
  appointmentsThisWeek: 312,
  messagesLast24h: 189,
}

const DEMO_EVENTS: SystemEventDTO[] = [
  { id: 'e-1', message: 'New clinician account created: Dr. Sophia Patel.', timestamp: '', level: 'info' },
  { id: 'e-2', message: 'Patient Alex Johnson logged in from a new device.', timestamp: '', level: 'info' },
  { id: 'e-3', message: 'Admin updated portal welcome content.', timestamp: '', level: 'info' },
  { id: 'e-4', message: 'System health check completed with no issues.', timestamp: '', level: 'info' },
  { id: 'e-5', message: '2-factor authentication enforced for admin accounts.', timestamp: '', level: 'info' },
]

const DEMO_USERS: AdminUserDTO[] = [
  { id: 'u-001', name: 'Alex Johnson', email: 'alex@demo.com', role: 'patient', subrole: null, status: 'Active', lastLogin: '2025-06-20T10:00:00Z' },
  { id: 'u-002', name: 'Dr. Sarah Chen', email: 'sarah@demo.com', role: 'doctor', subrole: null, status: 'Active', lastLogin: '2025-06-20T09:00:00Z' },
  { id: 'u-003', name: 'Maria Gomez', email: 'maria@demo.com', role: 'patient', subrole: null, status: 'Active', lastLogin: '2025-06-18T14:00:00Z' },
  { id: 'u-004', name: 'Dr. Sophia Patel', email: 'sophia@demo.com', role: 'doctor', subrole: null, status: 'Active', lastLogin: '2025-06-20T08:30:00Z' },
  { id: 'u-005', name: 'James Lee', email: 'james@demo.com', role: 'patient', subrole: null, status: 'Inactive', lastLogin: '2025-05-30T11:00:00Z' },
  { id: 'u-006', name: 'Admin User', email: 'admin@demo.com', role: 'admin', subrole: null, status: 'Active', lastLogin: '2025-06-20T07:00:00Z' },
]

const integrations: Integration[] = [
  { key: 'integrationApi', status: 'Online' },
  { key: 'integrationDb', status: 'Online' },
  { key: 'integrationEhr', status: 'Degraded' },
  { key: 'integrationCms', status: 'Online' },
]

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function AdminDashboardPage() {
  const { t } = useTranslation('admin')
  const { isDemoMode } = useDatabaseMode()
  const { user } = useAuth()
  const [userSearch, setUserSearch] = useState('')
  const [metrics, setMetrics] = useState<AdminMetricsDTO>(DEMO_METRICS)
  const [events, setEvents] = useState<SystemEventDTO[]>(DEMO_EVENTS)
  const [users, setUsers] = useState<AdminUserDTO[]>(DEMO_USERS)
  const [isLoading, setIsLoading] = useState(!isDemoMode)

  // Create user form
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<AdminUserDTO['role']>('patient')
  const [createSubrole, setCreateSubrole] = useState<PersonnelSubrole>('lab')
  const [creating, setCreating] = useState(false)

  // Delete user state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode) {
      setMetrics(DEMO_METRICS)
      setEvents(DEMO_EVENTS)
      setUsers(DEMO_USERS)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    Promise.all([fetchAdminMetrics(), fetchSystemEvents(), fetchUsers(1, 50)])
      .then(([m, e, u]) => {
        setMetrics(m)
        setEvents(e)
        setUsers(u.data)
      })
      .catch(() => {/* leave demo data on error */})
      .finally(() => setIsLoading(false))
  }, [isDemoMode])

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error(t('admin:deleteUser.selfError'))
      setConfirmDeleteId(null)
      return
    }
    setDeletingId(userId)
    setConfirmDeleteId(null)
    try {
      if (!isDemoMode) await deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      setEvents((prev) => [{
        id: `evt-${Date.now()}`,
        message: `Admin deleted user account: ${users.find((u) => u.id === userId)?.name ?? userId}`,
        timestamp: new Date().toISOString(),
        level: 'info',
      }, ...prev])
      toast.success(t('admin:deleteUser.success'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin:deleteUser.error'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault()
    setCreating(true)
    try {
      const newUser = await adminCreateUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        subrole: createRole === 'personnel' ? createSubrole : null,
        createdBy: user?.id,
      })
      setUsers((prev) => [newUser, ...prev])
      // Optimistically add a system activity entry so it appears immediately
      setEvents((prev) => [{
        id: `evt-${Date.now()}`,
        message: `Admin created new ${createRole} account: ${createName.trim()} (${createEmail.trim()})`,
        timestamp: new Date().toISOString(),
        level: 'info',
      }, ...prev])
      setShowCreateUser(false)
      setCreateName('')
      setCreateEmail('')
      setCreatePassword('')
      setCreateRole('patient')
      toast.success(t('admin:createUser.success'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin:createUser.error'))
    } finally {
      setCreating(false)
    }
  }

  const adminStats = [
    { key: 'activePatients', value: metrics.activePatients.toLocaleString() },
    { key: 'activeClinicians', value: metrics.activeClinicians.toLocaleString() },
    { key: 'appointmentsWeek', value: metrics.appointmentsThisWeek.toLocaleString() },
    { key: 'messages24h', value: metrics.messagesLast24h.toLocaleString() },
  ]

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

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
            {events.length === 0 ? (
              <li className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                {t('admin:dashboard.noActivity')}
              </li>
            ) : events.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
              >
                {event.message}
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
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t('admin:dashboard.userSearchPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 sm:w-44 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowCreateUser((v) => !v)}
              className="shrink-0 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {t('admin:createUser.buttonLabel')}
            </button>
          </div>
        </div>

        {showCreateUser && (
          <form
            onSubmit={(e) => void handleCreateUser(e)}
            className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/30"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('admin:createUser.title')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('admin:createUser.nameLabel')}
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('admin:createUser.emailLabel')}
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('admin:createUser.passwordLabel')}
              </label>
              <input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('admin:createUser.roleLabel')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['patient', 'doctor', 'personnel', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCreateRole(r)}
                    className={[
                      'rounded-xl border px-3 py-1.5 text-xs font-medium transition',
                      createRole === r
                        ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-900/30 dark:text-sky-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {t(`auth:roles.${r}`)}
                  </button>
                ))}
              </div>
            </div>
            {createRole === 'personnel' && (
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('admin:createUser.subroleLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['lab', 'nurse', 'desk'] as const).map((sr) => (
                    <button
                      key={sr}
                      type="button"
                      onClick={() => setCreateSubrole(sr)}
                      className={[
                        'rounded-xl border px-3 py-1.5 text-xs font-medium transition',
                        createSubrole === sr
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
                      ].join(' ')}
                    >
                      {t(`auth:subroles.${sr}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateUser(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
              >
                {creating ? t('admin:createUser.submitting') : t('admin:createUser.submitButton')}
              </button>
            </div>
          </form>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5">{t('admin:dashboard.userNameCol')}</th>
                <th className="px-3 py-2.5">{t('admin:dashboard.userRoleCol')}</th>
                <th className="px-3 py-2.5">{t('admin:dashboard.userLastLoginCol')}</th>
                <th className="px-3 py-2.5 text-right">{t('admin:dashboard.userStatusCol')}</th>
                <th className="px-3 py-2.5 text-right">{t('admin:dashboard.userActionsCol')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                    {t('admin:dashboard.noUsers')}
                  </td>
                </tr>
              ) : filteredUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className={`text-slate-700 dark:text-slate-300 ${i % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800'}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                        <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 capitalize text-slate-500 dark:text-slate-400">{u.role}</td>
                  <td className="px-3 py-2.5">{formatDate(u.lastLogin)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Badge
                      variant={
                        u.status === 'Active' ? 'success' : u.status === 'Inactive' ? 'neutral' : 'error'
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {confirmDeleteId === u.id ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">
                          {t('admin:deleteUser.confirmPrompt')}
                        </span>
                        <button
                          type="button"
                          disabled={deletingId === u.id}
                          onClick={() => void handleDeleteUser(u.id)}
                          className="rounded-xl bg-rose-600 px-2 py-0.5 text-[0.65rem] font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {t('admin:deleteUser.confirmButton')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-xl border border-slate-200 bg-white px-2 py-0.5 text-[0.65rem] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          {t('admin:deleteUser.cancelButton')}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={deletingId === u.id || u.id === user?.id}
                        title={u.id === user?.id ? t('admin:deleteUser.selfError') : t('admin:deleteUser.button')}
                        onClick={() => setConfirmDeleteId(u.id)}
                        className="rounded-xl border border-rose-200 bg-white px-2 py-0.5 text-[0.65rem] font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800/50 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
                      >
                        {deletingId === u.id ? '…' : t('admin:deleteUser.button')}
                      </button>
                    )}
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

