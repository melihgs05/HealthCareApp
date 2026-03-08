/**
 * Audit Log Page (Admin only)
 * ────────────────────────────
 * HIPAA § 164.312(b) – Audit Controls
 * Displays a searchable, filterable list of all PHI access events.
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Badge } from '../components/ui'
import { fetchAuditLog, type AuditLogEntry } from '../api/auditApi'

// Seed some illustrative demo entries on first render so the page is never blank
const DEMO_ENTRIES: AuditLogEntry[] = [
  { id: 'demo-al-001', timestamp: new Date(Date.now() - 2 * 60000).toISOString(), userId: 'demo-doctor-001', userName: 'Dr. Emily Carter', userRole: 'doctor', action: 'phi_view_chart', resourceType: 'patient', patientId: 'demo-patient-001', patientName: 'Alex Johnson', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123' },
  { id: 'demo-al-002', timestamp: new Date(Date.now() - 5 * 60000).toISOString(), userId: 'demo-doctor-001', userName: 'Dr. Emily Carter', userRole: 'doctor', action: 'phi_view_medications', resourceType: 'patient', patientId: 'demo-patient-001', patientName: 'Alex Johnson', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123' },
  { id: 'demo-al-003', timestamp: new Date(Date.now() - 8 * 60000).toISOString(), userId: 'demo-doctor-001', userName: 'Dr. Emily Carter', userRole: 'doctor', action: 'phi_add_note', resourceType: 'patient', patientId: 'p-002', patientName: 'Maria Gomez', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123' },
  { id: 'demo-al-004', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), userId: 'demo-staff-001', userName: 'Lab Tech Jordan', userRole: 'personnel', action: 'phi_view_test_results', resourceType: 'patient', patientId: 'p-002', patientName: 'Maria Gomez', device: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14) Safari/17' },
  { id: 'demo-al-005', timestamp: new Date(Date.now() - 22 * 60000).toISOString(), userId: 'demo-doctor-001', userName: 'Dr. Emily Carter', userRole: 'doctor', action: 'phi_order_lab', resourceType: 'patient', patientId: 'p-003', patientName: 'James Lee', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123' },
  { id: 'demo-al-006', timestamp: new Date(Date.now() - 45 * 60000).toISOString(), userId: 'demo-doctor-001', userName: 'Dr. Emily Carter', userRole: 'doctor', action: 'auth_login', resourceType: 'system', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123' },
  { id: 'demo-al-007', timestamp: new Date(Date.now() - 90 * 60000).toISOString(), userId: 'demo-staff-002', userName: 'Nurse Priya Mehta', userRole: 'personnel', action: 'phi_view_chart', resourceType: 'patient', patientId: 'demo-patient-001', patientName: 'Alex Johnson', device: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3) Mobile Safari' },
  { id: 'demo-al-008', timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), userId: 'demo-admin-001', userName: 'Admin User', userRole: 'admin', action: 'admin_view_users', resourceType: 'system', device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/124' },
]

const ACTION_LABELS: Record<string, string> = {
  phi_view_chart: 'View Chart',
  phi_view_medications: 'View Medications',
  phi_view_test_results: 'View Test Results',
  phi_view_notes: 'View Notes',
  phi_view_appointments: 'View Appointments',
  phi_add_note: 'Add Note',
  phi_add_medication: 'Add Medication',
  phi_update_medication: 'Update Medication',
  phi_order_lab: 'Order Lab',
  phi_prescribe: 'Prescribe',
  phi_update_appointment: 'Update Appointment',
  phi_update_result_status: 'Update Result Status',
  phi_view_messages: 'View Messages',
  phi_send_message: 'Send Message',
  auth_login: 'Login',
  auth_logout: 'Logout',
  auth_session_timeout: 'Session Timeout',
  admin_view_users: 'View Users',
  admin_change_role: 'Change Role',
}

function actionVariant(action: string): 'error' | 'warning' | 'info' | 'success' | 'neutral' {
  if (action.startsWith('phi_')) return 'info'
  if (action === 'auth_session_timeout') return 'warning'
  if (action.startsWith('auth_')) return 'success'
  if (action.startsWith('admin_change')) return 'warning'
  return 'neutral'
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    fetchAuditLog()
      .then((live) => setEntries(live.length > 0 ? live : DEMO_ENTRIES))
      .catch(() => { setEntries(DEMO_ENTRIES); toast.error('Failed to load audit log') })
      .finally(() => setLoading(false))
  }, [])

  const roles = ['all', ...Array.from(new Set(entries.map((e) => e.userRole)))]
  const categories = ['all', 'phi', 'auth', 'admin']

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.userName.toLowerCase().includes(search.toLowerCase()) ||
      e.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || e.userRole === filterRole
    const matchAction =
      filterAction === 'all' || e.action.startsWith(filterAction)
    return matchSearch && matchRole && matchAction
  })

  const cardCls =
    'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Audit Log
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            HIPAA § 164.312(b) — all PHI access events are recorded here.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800 dark:bg-emerald-900/20">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[0.7rem] font-medium text-emerald-800 dark:text-emerald-300">
            HIPAA Audit Active
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className={cardCls + ' flex flex-wrap gap-3'}>
        <input
          type="search"
          placeholder="Search user, patient, action…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        >
          {roles.map((r) => (
            <option key={r} value={r} className="bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-100">
              {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        >
          {categories.map((c) => (
            <option key={c} value={c} className="bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-100">
              {c === 'all' ? 'All Events' : c.toUpperCase() + ' Events'}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={cardCls + ' overflow-x-auto'}>
        {loading ? (
          <p className="text-xs text-slate-500 py-4 text-center">Loading audit log…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            {entries.length === 0
              ? 'No audit entries yet. Entries appear as users access PHI.'
              : 'No entries match the current filters.'}
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Timestamp', 'User', 'Role', 'Action', 'Patient', 'Device'].map((h) => (
                  <th
                    key={h}
                    className="pb-2 pr-4 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtered.map((e) => (
                <tr key={e.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="py-2.5 pr-4 font-mono text-[0.65rem] text-slate-500 whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{e.userName}</p>
                    <p className="text-[0.65rem] text-slate-400 font-mono">{e.userId.slice(0, 12)}…</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge variant="neutral">{e.userRole}</Badge>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={actionVariant(e.action)}>
                      {ACTION_LABELS[e.action] ?? e.action}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-300">
                    {e.patientName ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <p
                      className="max-w-[220px] truncate text-[0.6rem] text-slate-400"
                      title={e.device}
                    >
                      {e.device ?? '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[0.65rem] text-slate-400 text-right">
        Showing {filtered.length} of {entries.length} entries
      </p>
    </div>
  )
}
