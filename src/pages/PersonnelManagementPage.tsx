import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Badge } from '../components/ui'
import {
  fetchUsers,
  updateUserRole,
  fetchPersonnelPermissions,
  setPersonnelPermission,
  getSystemSetting,
  setSystemSetting,
} from '../api/adminApi'
import type { PersonnelPermissionDTO, PersonnelSubrole, AdminUserDTO } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

type PersonnelUser = {
  id: string
  name: string
  email: string
  role: string
  subrole?: string
  createdAt?: string
}

const DEMO_PERSONNEL: PersonnelUser[] = [
  { id: 'staff-001', name: 'Lisa Park', email: 'lisa@clinic.example', role: 'personnel', subrole: 'lab', createdAt: '2026-01-05' },
  { id: 'staff-002', name: 'Kevin Brown', email: 'kevin@clinic.example', role: 'personnel', subrole: 'nurse', createdAt: '2026-01-10' },
  { id: 'staff-003', name: 'Sarah Rivera', email: 'sarah@clinic.example', role: 'personnel', subrole: 'desk', createdAt: '2026-01-12' },
]

const ALL_PERMISSIONS = [
  'view_patient_basic',
  'view_patient_full',
  'view_prescriptions',
  'update_lab_results',
  'add_vitals',
  'view_appointments',
  'create_patient',
  'view_messages',
]

const SUBROLES: PersonnelSubrole[] = ['lab', 'nurse', 'desk']

export function PersonnelManagementPage() {
  const { user: currentUser } = useAuth()
  const [personnel, setPersonnel] = useState<PersonnelUser[]>([])
  const [selectedSubrole, setSelectedSubrole] = useState<PersonnelSubrole>('lab')
  const [permissions, setPermissions] = useState<PersonnelPermissionDTO[]>([])
  const [demoMode, setDemoMode] = useState(false)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [savingPerm, setSavingPerm] = useState<string | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPersonnel(DEMO_PERSONNEL)
      // Demo default permissions
      setPermissions([
        { id: 'p-1', subrole: 'lab', permission: 'view_patient_basic', granted: true },
        { id: 'p-2', subrole: 'lab', permission: 'update_lab_results', granted: true },
        { id: 'p-3', subrole: 'lab', permission: 'view_prescriptions', granted: false },
        { id: 'p-4', subrole: 'nurse', permission: 'view_patient_basic', granted: true },
        { id: 'p-5', subrole: 'nurse', permission: 'add_vitals', granted: true },
        { id: 'p-6', subrole: 'nurse', permission: 'view_appointments', granted: true },
        { id: 'p-7', subrole: 'desk', permission: 'create_patient', granted: true },
        { id: 'p-8', subrole: 'desk', permission: 'view_patient_basic', granted: true },
        { id: 'p-9', subrole: 'desk', permission: 'view_appointments', granted: true },
      ])
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const result = await fetchUsers(1, 100, undefined)
        const staffOnly = result.data.filter((u: AdminUserDTO) => u.role === 'personnel')
        setPersonnel(staffOnly as unknown as PersonnelUser[])
        const [perms, dm] = await Promise.all([
          fetchPersonnelPermissions(),
          getSystemSetting('demo_mode'),
        ])
        setPermissions(perms)
        setDemoMode(dm === 'true')
      } catch (err) {
        toast.error('Failed to load personnel data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // Load permissions when subrole tab changes
  useEffect(() => {
    if (!isSupabaseConfigured) return
    setLoadingPerms(true)
    fetchPersonnelPermissions(selectedSubrole)
      .then(setPermissions)
      .catch(console.error)
      .finally(() => setLoadingPerms(false))
  }, [selectedSubrole])

  const getPermission = (subrole: PersonnelSubrole, perm: string) =>
    permissions.find((p) => p.subrole === subrole && p.permission === perm)?.granted ?? false

  const handleTogglePermission = async (perm: string, current: boolean) => {
    const key = `${selectedSubrole}:${perm}`
    setSavingPerm(key)
    try {
      const newVal = !current
      if (isSupabaseConfigured) {
        await setPersonnelPermission(selectedSubrole, perm, newVal, currentUser!.id)
      }
      setPermissions((prev) => {
        const exists = prev.find((p) => p.subrole === selectedSubrole && p.permission === perm)
        if (exists) return prev.map((p) => p.subrole === selectedSubrole && p.permission === perm ? { ...p, granted: newVal } : p)
        return [...prev, { id: `p-${Date.now()}`, subrole: selectedSubrole, permission: perm, granted: newVal }]
      })
      toast.success(`${perm.replace(/_/g, ' ')} ${newVal ? 'granted' : 'revoked'} for ${selectedSubrole}`)
    } catch {
      toast.error('Failed to update permission')
    } finally {
      setSavingPerm(null)
    }
  }

  const handleChangeSubrole = async (userId: string, newSubrole: PersonnelSubrole) => {
    setUpdatingRole(userId)
    try {
      if (isSupabaseConfigured) await updateUserRole(userId, 'personnel', newSubrole)
      setPersonnel((prev) => prev.map((u) => u.id === userId ? { ...u, subrole: newSubrole } : u))
      toast.success('Subrole updated')
    } catch {
      toast.error('Failed to update subrole')
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleDemoToggle = async () => {
    const newVal = !demoMode
    try {
      if (isSupabaseConfigured) await setSystemSetting('demo_mode', String(newVal))
      setDemoMode(newVal)
      toast.success(`Demo mode ${newVal ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update demo mode')
    }
  }

  const cardCls = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:ring-emerald-900/40'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Personnel Management</h2>
      </div>

      {/* ── Demo mode toggle ── */}
      <div className={cardCls + ' flex items-center justify-between'}>
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Demo Mode</p>
          <p className="mt-0.5 text-xs text-slate-500">When enabled, the app shows simulated data to all users.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleDemoToggle()}
          className={[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
            demoMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600',
          ].join(' ')}
        >
          <span className={['inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', demoMode ? 'translate-x-6' : 'translate-x-1'].join(' ')} />
        </button>
      </div>

      {/* ── Personnel users list ── */}
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Staff Members</h3>
        {loading ? <p className="text-xs text-slate-500">Loading…</p> : personnel.length === 0 ? (
          <p className="text-xs text-slate-500">No personnel users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Subrole</th>
                  <th className="pb-2 pr-4">Since</th>
                  <th className="pb-2">Change Subrole</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {personnel.map((u) => (
                  <tr key={u.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-2 pr-4 font-medium">{u.name}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={u.subrole === 'lab' ? 'info' : u.subrole === 'nurse' ? 'success' : 'warning'}>
                        {u.subrole ?? '—'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{u.createdAt ?? '—'}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        {SUBROLES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={updatingRole === u.id || u.subrole === s}
                            onClick={() => void handleChangeSubrole(u.id, s)}
                            className={[
                              'rounded-xl border px-2 py-0.5 text-[0.65rem] font-medium transition',
                              u.subrole === s
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
                            ].join(' ')}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Permission matrix ── */}
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Permission Matrix</h3>
        <p className="mb-3 text-xs text-slate-500">Configure what each subrole is allowed to do. Changes apply immediately to all staff with that subrole.</p>

        {/* Subrole tabs */}
        <div className="mb-4 flex gap-2">
          {SUBROLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSubrole(s)}
              className={[
                'rounded-xl px-3 py-1.5 text-xs font-medium transition',
                selectedSubrole === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
              ].join(' ')}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loadingPerms ? <p className="text-xs text-slate-500">Loading permissions…</p> : (
          <div className="space-y-2">
            {ALL_PERMISSIONS.map((perm) => {
              const granted = getPermission(selectedSubrole, perm)
              const key = `${selectedSubrole}:${perm}`
              return (
                <div key={perm} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {perm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p className="text-[0.65rem] text-slate-500">{perm}</p>
                  </div>
                  <button
                    type="button"
                    disabled={savingPerm === key}
                    onClick={() => void handleTogglePermission(perm, granted)}
                    className={[
                      'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors',
                      granted ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
                      savingPerm === key ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <span className={['inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', granted ? 'translate-x-[18px]' : 'translate-x-[2px]'].join(' ')} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
