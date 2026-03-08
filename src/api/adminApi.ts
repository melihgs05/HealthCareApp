import { supabase } from '../lib/supabase'
import type {
  AdminMetricsDTO,
  SystemEventDTO,
  AdminUserDTO,
  PersonnelPermissionDTO,
  PersonnelTaskDTO,
} from './types'

// ──────────────────────────────────────────────────────────
// Metrics
// ──────────────────────────────────────────────────────────
export async function fetchAdminMetrics(): Promise<AdminMetricsDTO> {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const [patients, clinicians, appts, msgs] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'patient'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['doctor', 'personnel']),
    supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('date', weekStart.toISOString().slice(0, 10))
      .lte('date', weekEnd.toISOString().slice(0, 10)),
    supabase.from('messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString()),
  ])

  return {
    activePatients: patients.count ?? 0,
    activeClinicians: clinicians.count ?? 0,
    appointmentsThisWeek: appts.count ?? 0,
    messagesLast24h: msgs.count ?? 0,
  }
}

// ──────────────────────────────────────────────────────────
// System Events (activity log of all users)
// ──────────────────────────────────────────────────────────
export async function fetchSystemEvents(): Promise<SystemEventDTO[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, type, description, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    message: row.description as string,
    timestamp: row.created_at as string,
    level: (row.type === 'error' ? 'error' : row.type === 'warning' ? 'warning' : 'info') as SystemEventDTO['level'],
  }))
}

// ──────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────
export async function fetchUsers(
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<{ data: AdminUserDTO[]; total: number }> {
  let query = supabase
    .from('profiles')
    .select('id, name, email, role, subrole, created_at', { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) throw new Error(error.message)

  const users: AdminUserDTO[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as AdminUserDTO['role'],
    subrole: row.subrole as string | null,
    status: 'Active' as const,
    lastLogin: row.created_at as string,
  }))

  return { data: users, total: count ?? 0 }
}

export async function updateUserRole(userId: string, role: string, subrole?: string): Promise<void> {
  const update: Record<string, string | null> = { role }
  if (subrole !== undefined) update.subrole = subrole ?? null
  const { error } = await supabase.from('profiles').update(update).eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function deleteUser(userId: string): Promise<void> {
  // Deleting from auth.users cascades to profiles due to FK
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// Personnel Permissions
// ──────────────────────────────────────────────────────────
export async function fetchPersonnelPermissions(
  subrole?: string,
): Promise<PersonnelPermissionDTO[]> {
  let query = supabase.from('personnel_permissions').select('subrole, permission, granted')
  if (subrole) query = query.eq('subrole', subrole)
  const { data, error } = await query.order('subrole').order('permission')
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    subrole: row.subrole as string,
    permission: row.permission as string,
    granted: row.granted as boolean,
  }))
}

export async function setPersonnelPermission(
  subrole: string,
  permission: string,
  granted: boolean,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('personnel_permissions')
    .upsert({ subrole, permission, granted, updated_by: updatedBy }, { onConflict: 'subrole,permission' })
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// System settings (including demo_mode toggle)
// ──────────────────────────────────────────────────────────
export async function getSystemSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from('system_settings').select('value').eq('key', key).single()
  return data?.value ?? null
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// Create a new patient record (desk personnel / admin)
// ──────────────────────────────────────────────────────────
export async function createPatientRecord(payload: {
  name: string
  email: string
  dob: string
  insurance?: string
  primaryDoctorId?: string
  phone?: string
  city?: string
  address?: string
  createdBy: string
}): Promise<{ profileId: string; mrn: string }> {
  // Generate a temporary MRN on the client side; the DB trigger will also create
  // a patients row but may use a different MRN. We use a unique email-based ID.
  const tempEmail = payload.email.toLowerCase().trim()

  // Create an auth user invite or just insert a profile (desk creates, patient activates later)
  const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`

  const { data: profile, error: pe } = await supabase
    .from('profiles')
    .insert({
      id: crypto.randomUUID(),
      name: payload.name,
      email: tempEmail,
      role: 'patient',
      phone: payload.phone ?? null,
    })
    .select('id')
    .single()

  if (pe) throw new Error(pe.message)

  const { error: pate } = await supabase.from('patients').insert({
    id: profile.id,
    mrn,
    dob: payload.dob,
    insurance: payload.insurance ?? null,
    primary_doctor_id: payload.primaryDoctorId ?? null,
    city: payload.city ?? null,
    address: payload.address ?? null,
  })

  if (pate) throw new Error(pate.message)

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: payload.createdBy,
    type: 'Document',
    description: `Created new patient record for ${payload.name} (${mrn})`,
  })

  return { profileId: profile.id, mrn }
}

// ──────────────────────────────────────────────────────────
// Personnel tasks (admin view of all tasks)
// ──────────────────────────────────────────────────────────
export async function fetchAllPersonnelTasks(): Promise<PersonnelTaskDTO[]> {
  const { data, error } = await supabase
    .from('personnel_tasks')
    .select(`
      id, title, description, priority, status, due_date, created_at,
      assigned_to, assigned_by, patient_id,
      assignee:profiles!personnel_tasks_assigned_to_fkey(name),
      assigner:profiles!personnel_tasks_assigned_by_fkey(name),
      patient:profiles!personnel_tasks_patient_id_fkey(name)
    `)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    assignedTo: row.assigned_to as string,
    assignedToName: (row.assignee as { name: string } | null)?.name ?? '',
    assignedBy: row.assigned_by as string,
    assignedByName: (row.assigner as { name: string } | null)?.name ?? '',
    patientId: row.patient_id as string | null,
    patientName: (row.patient as { name: string } | null)?.name ?? null,
    title: row.title as string,
    description: row.description as string | null,
    priority: row.priority as PersonnelTaskDTO['priority'],
    status: row.status as PersonnelTaskDTO['status'],
    dueDate: row.due_date as string | null,
    createdAt: row.created_at as string,
  }))
}

