import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Badge } from '../components/ui'
import { fetchMyTasks, updateTaskStatus } from '../api/personnelApi'
import type { PersonnelTaskDTO } from '../api/types'
import { isSupabaseConfigured } from '../lib/supabase'

const DEMO_TASKS: PersonnelTaskDTO[] = [
  { id: 'task-001', title: 'Prepare patient Alex Johnson for Room 3A', status: 'pending', priority: 'high', assignedTo: 'demo-staff-001', createdBy: 'demo-doctor-001', createdAt: new Date().toISOString(), dueDate: new Date().toISOString().slice(0, 10) },
  { id: 'task-002', title: 'Process CBC results — Maria Gomez', status: 'in_progress', priority: 'high', assignedTo: 'demo-staff-001', createdBy: 'demo-doctor-001', createdAt: new Date().toISOString() },
  { id: 'task-003', title: 'Restock exam gloves Room 2', status: 'pending', priority: 'low', assignedTo: 'demo-staff-001', createdBy: 'demo-staff-001', createdAt: new Date().toISOString() },
  { id: 'task-004', title: 'Call insurance — James Lee deductible check', status: 'completed', priority: 'medium', assignedTo: 'demo-staff-001', createdBy: 'demo-doctor-001', createdAt: new Date().toISOString() },
  { id: 'task-005', title: 'Verify patient insurance — Sara Kim', status: 'pending', priority: 'medium', assignedTo: 'demo-staff-001', createdBy: 'demo-staff-001', createdAt: new Date().toISOString(), dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
]

type Filter = 'all' | 'pending' | 'in_progress' | 'completed'

export function PersonnelTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<PersonnelTaskDTO[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const staffId = user?.id ?? 'demo-staff-001'

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setTasks(DEMO_TASKS)
      setLoading(false)
      return
    }
    fetchMyTasks(staffId)
      .then(setTasks)
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [staffId])

  const handleSetStatus = async (taskId: string, next: PersonnelTaskDTO['status']) => {
    setUpdating(taskId)
    try {
      if (isSupabaseConfigured) await updateTaskStatus(taskId, next)
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: next } : t))
    } catch {
      toast.error('Failed to update task')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = tasks.filter((t) => filter === 'all' || t.status === filter)

  const counts: Record<Filter, number> = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }

  const cardCls = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-800 dark:ring-emerald-900/40'

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My Tasks</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'in_progress', 'completed'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              'rounded-xl px-3 py-1.5 text-xs font-medium transition',
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
            ].join(' ')}
          >
            {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      <div className={cardCls}>
        {loading ? (
          <p className="text-xs text-slate-500">Loading tasks…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500">No tasks in this category.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => (
              <div
                key={task.id}
                className={[
                  'rounded-2xl border p-3 transition',
                  task.status === 'completed'
                    ? 'border-emerald-100 bg-emerald-50/40 opacity-60 dark:border-emerald-900/40 dark:bg-emerald-900/5'
                    : task.priority === 'high'
                      ? 'border-red-100 bg-red-50/40 dark:border-red-900/40 dark:bg-red-900/5'
                      : 'border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className={`mt-0.5 text-[0.65rem] ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                        Due: {task.dueDate}
                      </p>
                    )}
                    <p className="mt-0.5 text-[0.65rem] text-slate-500">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'neutral'}>
                      {task.priority}
                    </Badge>
                    <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'warning'}>
                      {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Status action buttons */}
                {task.status !== 'completed' && (
                  <div className="mt-2 flex gap-2">
                    {task.status === 'pending' && (
                      <button
                        type="button"
                        disabled={updating === task.id}
                        onClick={() => void handleSetStatus(task.id, 'in_progress')}
                        className="rounded-xl bg-sky-600 px-3 py-1 text-[0.65rem] font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        {updating === task.id ? '…' : 'Start'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={updating === task.id}
                      onClick={() => void handleSetStatus(task.id, 'completed')}
                      className="rounded-xl bg-emerald-600 px-3 py-1 text-[0.65rem] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updating === task.id ? '…' : 'Mark Done'}
                    </button>
                  </div>
                )}
                {task.status === 'completed' && (
                  <button
                    type="button"
                    disabled={updating === task.id}
                    onClick={() => void handleSetStatus(task.id, 'pending')}
                    className="mt-2 rounded-xl border border-slate-200 px-3 py-1 text-[0.65rem] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
