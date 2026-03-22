import { supabase } from '../lib/supabase'
import { isNeonConfigured, getNeonSql } from '../lib/neonClient'
import { hashPassword } from '../lib/neonAuth'
import { sendWelcomeWithCredentials } from '../lib/emailService'
import type {
  AdminMetricsDTO,
  SystemEventDTO,
  AdminUserDTO,
  PersonnelPermissionDTO,
  PersonnelTaskDTO,
  PersonnelSubrole,
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

  if (isNeonConfigured) {
    const sql = getNeonSql()
    const ws = weekStart.toISOString().slice(0, 10)
    const we = weekEnd.toISOString().slice(0, 10)
    const yd = yesterday.toISOString()
    const [pRow, cRow, aRow, mRow] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM profiles WHERE role = 'patient'`,
      sql`SELECT COUNT(*)::int AS n FROM profiles WHERE role IN ('doctor','personnel')`,
      sql`SELECT COUNT(*)::int AS n FROM appointments WHERE date BETWEEN ${ws} AND ${we}`,
      sql`SELECT COUNT(*)::int AS n FROM messages WHERE created_at >= ${yd}`,
    ])
    return {
      activePatients: Number(pRow[0]?.n ?? 0),
      activeClinicians: Number(cRow[0]?.n ?? 0),
      appointmentsThisWeek: Number(aRow[0]?.n ?? 0),
      messagesLast24h: Number(mRow[0]?.n ?? 0),
    }
  }

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
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT id, type, description, created_at
      FROM activity_log
      ORDER BY created_at DESC
      LIMIT 30
    `
    return rows.map((row) => ({
      id: row.id as string,
      message: row.description as string,
      timestamp: row.created_at as string,
      level: (row.type === 'error' ? 'error' : row.type === 'warning' ? 'warning' : 'info') as SystemEventDTO['level'],
    }))
  }

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
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const offset = (page - 1) * pageSize
    const pattern = search ? `%${search}%` : null
    const rows = pattern
      ? await sql`
          SELECT id, name, email, role, subrole, created_at
          FROM profiles
          WHERE name ILIKE ${pattern} OR email ILIKE ${pattern}
          ORDER BY created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `
      : await sql`
          SELECT id, name, email, role, subrole, created_at
          FROM profiles
          ORDER BY created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `
    const totalRows = pattern
      ? await sql`SELECT COUNT(*)::int AS n FROM profiles WHERE name ILIKE ${pattern} OR email ILIKE ${pattern}`
      : await sql`SELECT COUNT(*)::int AS n FROM profiles`

    const users: AdminUserDTO[] = rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as AdminUserDTO['role'],
      subrole: row.subrole as string | null,
      status: 'Active' as const,
      lastLogin: row.created_at as string,
    }))
    return { data: users, total: Number(totalRows[0]?.n ?? 0) }
  }

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
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`UPDATE profiles SET role = ${role}, subrole = ${subrole ?? null} WHERE id = ${userId}`
    return
  }
  const update: Record<string, string | null> = { role }
  if (subrole !== undefined) update.subrole = subrole ?? null
  const { error } = await supabase.from('profiles').update(update).eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function deleteUser(userId: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`DELETE FROM profiles WHERE id = ${userId}`
    return
  }
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
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = subrole
      ? await sql`SELECT subrole, permission, granted FROM personnel_permissions WHERE subrole = ${subrole} ORDER BY subrole, permission`
      : await sql`SELECT subrole, permission, granted FROM personnel_permissions ORDER BY subrole, permission`
    return rows.map((row) => ({
      subrole: row.subrole as string,
      permission: row.permission as string,
      granted: row.granted as boolean,
    }))
  }

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
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`
      INSERT INTO personnel_permissions (subrole, permission, granted, updated_by)
      VALUES (${subrole}, ${permission}, ${granted}, ${updatedBy})
      ON CONFLICT (subrole, permission)
      DO UPDATE SET granted = ${granted}, updated_by = ${updatedBy}, updated_at = now()
    `
    return
  }
  const { error } = await supabase
    .from('personnel_permissions')
    .upsert({ subrole, permission, granted, updated_by: updatedBy }, { onConflict: 'subrole,permission' })
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// System settings (including demo_mode toggle)
// ──────────────────────────────────────────────────────────
export async function getSystemSetting(key: string): Promise<string | null> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`SELECT value FROM system_settings WHERE key = ${key} LIMIT 1`
    return (rows[0]?.value as string | null | undefined) ?? null
  }
  const { data } = await supabase.from('system_settings').select('value').eq('key', key).single()
  return data?.value ?? null
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`
      INSERT INTO system_settings (key, value)
      VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = now()
    `
    return
  }
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────// Admin: create any-role user account (password-hashed)
// ────────────────────────────────────────────────────────
export async function adminCreateUser(payload: {
  name: string
  email: string
  password: string
  role: AdminUserDTO['role']
  subrole?: PersonnelSubrole | null
  createdBy?: string
}): Promise<AdminUserDTO> {
  const email = payload.email.toLowerCase().trim()

  if (isNeonConfigured) {
    const sql = getNeonSql()
    const existing = await sql`SELECT id FROM profiles WHERE email = ${email} LIMIT 1`
    if ((existing as Record<string, unknown>[]).length) {
      throw new Error('An account with this email already exists')
    }
    const passwordHash = await hashPassword(payload.password)
    const rows = await sql`
      INSERT INTO profiles (name, email, role, subrole, password_hash)
      VALUES (${payload.name}, ${email}, ${payload.role}, ${payload.subrole ?? null}, ${passwordHash})
      RETURNING id, name, email, role, subrole, created_at
    `
    const row = (rows as Record<string, unknown>[])[0]
    if (payload.role === 'patient') {
      const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`
      await sql`
        INSERT INTO patients (id, mrn, dob)
        VALUES (${row.id as string}, ${mrn}, ${'1990-01-01'})
        ON CONFLICT (id) DO NOTHING
      `
    }
    // Log to system activity
    const actorId = payload.createdBy ?? row.id as string
    await sql`
      INSERT INTO activity_log (user_id, type, description)
      VALUES (${actorId}, 'info', ${'Admin created new ' + payload.role + ' account: ' + payload.name + ' (' + email + ')'})
    `
    // Send welcome email with temporary password
    void sendWelcomeWithCredentials(email, payload.name, payload.password, payload.role)
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as AdminUserDTO['role'],
      subrole: row.subrole as string | null,
      status: 'Active',
      lastLogin: row.created_at as string,
    }
  }

  // Supabase path — inserts profile directly (no Supabase Auth credentials)
  const profileId = crypto.randomUUID()
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: profileId, name: payload.name, email, role: payload.role, subrole: payload.subrole ?? null })
    .select('id, name, email, role, subrole, created_at')
    .single()
  if (error) throw new Error(error.message)
  const p = data as Record<string, unknown>
  if (payload.role === 'patient') {
    const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`
    await supabase.from('patients').insert({ id: profileId, mrn, dob: '1990-01-01' })
  }
  // Log to system activity
  const actorId = payload.createdBy ?? profileId
  await supabase.from('activity_log').insert({
    user_id: actorId,
    type: 'info',
    description: `Admin created new ${payload.role} account: ${payload.name} (${email})`,
  })
  // Send welcome email with temporary password
  void sendWelcomeWithCredentials(email, payload.name, payload.password, payload.role)
  return {
    id: p.id as string,
    name: p.name as string,
    email: p.email as string,
    role: p.role as AdminUserDTO['role'],
    subrole: p.subrole as string | null,
    status: 'Active',
    lastLogin: p.created_at as string,
  }
}

// ────────────────────────────────────────────────────────// Create a new patient record (desk personnel / admin)
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
  const tempEmail = payload.email.toLowerCase().trim()
  const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`
  const profileId = crypto.randomUUID()

  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`
      INSERT INTO profiles (id, name, email, role, phone)
      VALUES (${profileId}, ${payload.name}, ${tempEmail}, 'patient', ${payload.phone ?? null})
    `
    await sql`
      INSERT INTO patients (id, mrn, dob, insurance, primary_doctor_id, city, address)
      VALUES (
        ${profileId}, ${mrn}, ${payload.dob},
        ${payload.insurance ?? null}, ${payload.primaryDoctorId ?? null},
        ${payload.city ?? null}, ${payload.address ?? null}
      )
    `
    await sql`
      INSERT INTO activity_log (user_id, type, description)
      VALUES (${payload.createdBy}, 'Document', ${'Created new patient record for ' + payload.name + ' (' + mrn + ')'})
    `
    return { profileId, mrn }
  }

  const { data: profile, error: pe } = await supabase
    .from('profiles')
    .insert({
      id: profileId,
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
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT
        pt.id, pt.title, pt.description, pt.priority, pt.status,
        pt.due_date, pt.created_at, pt.assigned_to, pt.assigned_by, pt.patient_id,
        a.name AS assignee_name, b.name AS assigner_name, c.name AS patient_name
      FROM personnel_tasks pt
      LEFT JOIN profiles a ON a.id = pt.assigned_to
      LEFT JOIN profiles b ON b.id = pt.assigned_by
      LEFT JOIN profiles c ON c.id = pt.patient_id
      ORDER BY pt.created_at DESC
    `
    return rows.map((row) => ({
      id: row.id as string,
      assignedTo: row.assigned_to as string,
      assignedToName: (row.assignee_name as string) ?? '',
      assignedBy: row.assigned_by as string,
      assignedByName: (row.assigner_name as string) ?? '',
      patientId: row.patient_id as string | null,
      patientName: (row.patient_name as string | null) ?? null,
      title: row.title as string,
      description: row.description as string | null,
      priority: row.priority as PersonnelTaskDTO['priority'],
      status: row.status as PersonnelTaskDTO['status'],
      dueDate: row.due_date as string | null,
      createdAt: row.created_at as string,
    }))
  }

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

