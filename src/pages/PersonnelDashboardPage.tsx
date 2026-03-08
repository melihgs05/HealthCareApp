import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui'
import {
  fetchMyTasks,
  updateTaskStatus,
  fetchMyPermissions,
  hasPermission,
  fetchPendingLabTests,
  updateTestResult,
} from '../api/personnelApi'
import { createPatientRecord } from '../api/adminApi'
import type { PersonnelTaskDTO, PersonnelPermissionDTO } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

// ─── Demo data ───────────────────────────────────────────────────
const DEMO_TASKS: PersonnelTaskDTO[] = [
  { id: 'task-001', title: 'Prepare patient Alex Johnson for Room 3A', status: 'pending', priority: 'high', assignedTo: 'demo-staff-001', createdBy: 'demo-doctor-001', createdAt: new Date().toISOString(), dueDate: new Date().toISOString().slice(0,10) },
  { id: 'task-002', title: 'Process CBC results — Maria Gomez', status: 'in_progress', priority: 'high', assignedTo: 'demo-staff-001', createdBy: 'demo-doctor-001', createdAt: new Date().toISOString() },
  { id: 'task-003', title: 'Restock exam gloves Room 2', status: 'pending', priority: 'low', assignedTo: 'demo-staff-001', createdBy: 'demo-staff-001', createdAt: new Date().toISOString() },
  { id: 'task-004', title: 'Call insurance — James Lee deductible check', status: 'completed', priority: 'medium', assignedTo: 'demo-staff-001', createdBy: 'demo-doctor-001', createdAt: new Date().toISOString() },
]

const DEMO_PERMISSIONS: PersonnelPermissionDTO[] = [
  { id: 'p-1', subrole: 'lab', permission: 'view_patient_basic', granted: true },
  { id: 'p-2', subrole: 'lab', permission: 'update_lab_results', granted: true },
  { id: 'p-3', subrole: 'lab', permission: 'view_prescriptions', granted: false },
  { id: 'p-4', subrole: 'nurse', permission: 'view_patient_basic', granted: true },
  { id: 'p-5', subrole: 'nurse', permission: 'add_vitals', granted: true },
  { id: 'p-6', subrole: 'desk', permission: 'create_patient', granted: true },
  { id: 'p-7', subrole: 'desk', permission: 'view_appointments', granted: true },
]

const DEMO_LAB_ORDERS = [
  { id: 'lo-001', patientId: 'demo-patient-001', patientName: 'Alex Johnson', testType: 'Complete Metabolic Panel', orderedBy: 'demo-doctor-001', orderedByName: 'Dr. Emily Carter', status: 'pending', createdAt: new Date().toISOString() },
  { id: 'lo-002', patientId: 'p-002', patientName: 'Maria Gomez', testType: 'CBC', orderedBy: 'demo-doctor-001', orderedByName: 'Dr. Emily Carter', status: 'in_progress', createdAt: new Date().toISOString() },
]

export function PersonnelDashboardPage() {
  const { user } = useAuth()
  const subrole = user?.subrole ?? 'desk'

  const [tasks, setTasks] = useState<PersonnelTaskDTO[]>([])
  const [permissions, setPermissions] = useState<PersonnelPermissionDTO[]>([])
  const [labOrders, setLabOrders] = useState<typeof DEMO_LAB_ORDERS>([])
  const [loading, setLoading] = useState(true)

  // Lab result submit
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [resultSummary, setResultSummary] = useState('')
  const [submittingResult, setSubmittingResult] = useState(false)

  // Register patient (desk)
  const [regName, setRegName] = useState('')
  const [regDob, setRegDob] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regInsurance, setRegInsurance] = useState('')
  const [registeringPatient, setRegisteringPatient] = useState(false)

  const staffId = user?.id ?? 'demo-staff-001'

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setTasks(DEMO_TASKS)
      setPermissions(DEMO_PERMISSIONS.filter((p) => p.subrole === subrole))
      if (subrole === 'lab') setLabOrders(DEMO_LAB_ORDERS)
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const [t, perms] = await Promise.all([
          fetchMyTasks(staffId),
          fetchMyPermissions(subrole),
        ])
        setTasks(t)
        setPermissions(perms)
        if (subrole === 'lab') {
          const labs = await fetchPendingLabTests(staffId)
          setLabOrders(labs as unknown as typeof DEMO_LAB_ORDERS)
        }
      } catch (err) {
        toast.error('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [staffId, subrole])

  const handleStatusToggle = async (taskId: string, currentStatus: PersonnelTaskDTO['status']) => {
    const next: PersonnelTaskDTO['status'] = currentStatus === 'pending' ? 'in_progress' : currentStatus === 'in_progress' ? 'completed' : 'pending'
    try {
      if (isSupabaseConfigured) await updateTaskStatus(taskId, next)
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: next } : t))
    } catch { toast.error('Failed to update task') }
  }

  const handleSubmitResult = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedTestId || !resultSummary.trim()) return
    setSubmittingResult(true)
    try {
      if (isSupabaseConfigured) await updateTestResult(selectedTestId, resultSummary, 'Normal')
      setLabOrders((prev) => prev.map((o) => o.id === selectedTestId ? { ...o, status: 'completed' } : o))
      toast.success('Lab result submitted')
      setSelectedTestId(null)
      setResultSummary('')
    } catch { toast.error('Failed to submit result') } finally { setSubmittingResult(false) }
  }

  const handleRegisterPatient = async (e: FormEvent) => {
    e.preventDefault()
    if (!regName || !regDob) return
    setRegisteringPatient(true)
    try {
      if (isSupabaseConfigured) {
        await createPatientRecord({ name: regName, email: `${regName.toLowerCase().replace(/\s+/g, '.')}@carebridge.demo`, dob: regDob, phone: regPhone, insurance: regInsurance, createdBy: user?.id ?? 'admin' })
      }
      toast.success(`Patient ${regName} registered`)
      setRegName(''); setRegDob(''); setRegPhone(''); setRegInsurance('')
    } catch { toast.error('Failed to register patient') } finally { setRegisteringPatient(false) }
  }

  const canUpdateLab = hasPermission(permissions, 'update_lab_results')
  const canCreatePatient = hasPermission(permissions, 'create_patient')
  const cardCls = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:ring-emerald-900/40'

  const pendingCount = tasks.filter((t) => t.status === 'pending').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const completedCount = tasks.filter((t) => t.status === 'completed').length

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Tasks', value: pendingCount, color: 'text-amber-600' },
          { label: 'In Progress', value: inProgressCount, color: 'text-sky-600' },
          { label: 'Completed Today', value: completedCount, color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className={cardCls}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Task list ── */}
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">My Tasks</h3>
          {loading ? <p className="text-xs text-slate-500">Loading…</p> : tasks.length === 0 ? (
            <p className="text-xs text-slate-500">No tasks assigned.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className={`flex items-start justify-between rounded-xl p-3 ${task.status === 'completed' ? 'opacity-50' : ''} bg-slate-50 dark:bg-slate-700/40`}>
                  <div className="flex-1 mr-3">
                    <p className={`text-xs font-medium ${task.status === 'completed' ? 'line-through' : ''} text-slate-900 dark:text-slate-100`}>
                      {task.title}
                    </p>
                    {task.dueDate && <p className="text-[0.65rem] text-slate-500 mt-0.5">Due: {task.dueDate}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'neutral'}>
                      {task.priority}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => void handleStatusToggle(task.id, task.status)}
                      className={[
                        'rounded-xl border px-2 py-1 text-[0.65rem] font-medium transition',
                        task.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300' :
                          task.status === 'in_progress' ? 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-300' :
                            'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
                      ].join(' ')}
                    >
                      {task.status === 'pending' ? 'Start' : task.status === 'in_progress' ? 'Done' : '✓ Done'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Lab subrole: pending orders ── */}
        {subrole === 'lab' && (
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Pending Lab Orders</h3>
            {labOrders.filter((o) => o.status !== 'completed').length === 0 ? (
              <p className="text-xs text-slate-500">No pending orders.</p>
            ) : (
              <div className="space-y-2">
                {labOrders.filter((o) => o.status !== 'completed').map((o) => (
                  <div key={o.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{o.testType}</p>
                        <p className="text-[0.65rem] text-slate-500">{o.patientName} · Ordered by {o.orderedByName}</p>
                      </div>
                      <Badge variant={o.status === 'in_progress' ? 'info' : 'warning'}>{o.status}</Badge>
                    </div>
                    {canUpdateLab && (
                      <button
                        type="button"
                        onClick={() => setSelectedTestId(o.id)}
                        className="mt-2 rounded-xl bg-indigo-600 px-3 py-1 text-[0.65rem] font-medium text-white hover:bg-indigo-700"
                      >
                        Enter Results
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Result entry modal-like inline form */}
            {selectedTestId && (
              <form onSubmit={(e) => void handleSubmitResult(e)} className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-900/10">
                <p className="text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-2">Enter Result Summary</p>
                <textarea
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. All values within normal range. WBC 6.5, RBC 4.8…"
                  className="w-full resize-none rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div className="mt-2 flex gap-2">
                  <button type="submit" disabled={submittingResult} className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                    {submittingResult ? 'Submitting…' : 'Submit'}
                  </button>
                  <button type="button" onClick={() => setSelectedTestId(null)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Desk subrole: register patient ── */}
        {subrole === 'desk' && canCreatePatient && (
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Register New Patient</h3>
            <form onSubmit={(e) => void handleRegisterPatient(e)} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
                <input value={regName} onChange={(e) => setRegName(e.target.value)} required placeholder="First Last" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Date of Birth *</label>
                <input type="date" value={regDob} onChange={(e) => setRegDob(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+1 555 000 0000" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Insurance Provider</label>
                <input value={regInsurance} onChange={(e) => setRegInsurance(e.target.value)} placeholder="e.g. BlueCross PPO" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <button type="submit" disabled={registeringPatient} className="w-full rounded-xl bg-amber-600 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                {registeringPatient ? 'Registering…' : 'Register Patient'}
              </button>
            </form>
          </div>
        )}

        {/* ── Nurse: no extra panel for now, just shows tasks + permissions ── */}
        {subrole === 'nurse' && (
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">My Permissions</h3>
            <div className="space-y-1">
              {permissions.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-slate-700/40">
                  <span className="text-xs text-slate-700 dark:text-slate-300">{p.permission.replace(/_/g, ' ')}</span>
                  <Badge variant={p.granted ? 'success' : 'error'}>{p.granted ? 'Granted' : 'Denied'}</Badge>
                </div>
              ))}
              {permissions.length === 0 && <p className="text-xs text-slate-500">No permissions configured.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
