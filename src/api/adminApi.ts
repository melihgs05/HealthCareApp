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
  RoomDTO,
  RoomType,
  RoomStatus,
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
  password?: string
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
  const passwordHash = payload.password ? await hashPassword(payload.password) : null

  if (isNeonConfigured) {
    const sql = getNeonSql()
    // The on_profile_created trigger auto-creates the patients row with a generated MRN.
    // We INSERT the profile first, then UPDATE the patients row with the real data.
    await sql`
      INSERT INTO profiles (id, name, email, role, phone, password_hash)
      VALUES (${profileId}, ${payload.name}, ${tempEmail}, 'patient', ${payload.phone ?? null}, ${passwordHash})
    `
    // Trigger ran — update the auto-created patients row with actual intake data
    await sql`
      UPDATE patients SET
        dob                = ${payload.dob},
        insurance          = ${payload.insurance ?? null},
        primary_doctor_id  = ${payload.primaryDoctorId ?? null},
        city               = ${payload.city ?? null},
        address            = ${payload.address ?? null}
      WHERE id = ${profileId}
    `
    // Fetch the MRN the trigger generated
    const mrnRows = await sql`SELECT mrn FROM patients WHERE id = ${profileId} LIMIT 1`
    const generatedMrn = ((mrnRows as Record<string, unknown>[])[0]?.mrn as string) ?? mrn
    await sql`
      INSERT INTO activity_log (user_id, type, description)
      VALUES (${payload.createdBy}, 'Document', ${'Created new patient record for ' + payload.name + ' (' + generatedMrn + ')'})
    `
    if (payload.password) {
      void sendWelcomeWithCredentials(tempEmail, payload.name, payload.password, 'patient')
    }
    return { profileId, mrn: generatedMrn }
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

  if (payload.password) {
    const hash = await hashPassword(payload.password)
    await supabase.from('profiles').update({ password_hash: hash }).eq('id', profileId)
  }

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

  if (payload.password) {
    void sendWelcomeWithCredentials(tempEmail, payload.name, payload.password, 'patient')
  }

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

// ──────────────────────────────────────────────────────────
// Room Management (admin CRUD)
// ──────────────────────────────────────────────────────────

function mapRoom(row: Record<string, unknown>): RoomDTO {
  return {
    id: row.id as string,
    number: row.number as string,
    floor: row.floor as number,
    wing: row.wing as string | null,
    type: row.type as RoomType,
    capacity: row.capacity as number,
    status: row.status as RoomStatus,
    notes: row.notes as string | null,
  }
}

export async function adminFetchRooms(): Promise<RoomDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`SELECT id, number, floor, wing, type, capacity, status, notes FROM rooms ORDER BY floor, number`
    return (rows as Record<string, unknown>[]).map(mapRoom)
  }
  const { data, error } = await supabase.from('rooms').select('id, number, floor, wing, type, capacity, status, notes').order('floor').order('number')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => mapRoom(r))
}

export async function adminCreateRoom(payload: {
  number: string
  floor: number
  wing: string | null
  type: RoomType
  capacity: number
  status: RoomStatus
  notes: string | null
}): Promise<RoomDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      INSERT INTO rooms (number, floor, wing, type, capacity, status, notes)
      VALUES (${payload.number}, ${payload.floor}, ${payload.wing}, ${payload.type}, ${payload.capacity}, ${payload.status}, ${payload.notes})
      RETURNING id, number, floor, wing, type, capacity, status, notes
    `
    return mapRoom((rows as Record<string, unknown>[])[0])
  }
  const { data, error } = await supabase.from('rooms').insert({
    number: payload.number, floor: payload.floor, wing: payload.wing,
    type: payload.type, capacity: payload.capacity, status: payload.status, notes: payload.notes,
  }).select('id, number, floor, wing, type, capacity, status, notes').single()
  if (error) throw new Error(error.message)
  return mapRoom(data as Record<string, unknown>)
}

export async function adminUpdateRoom(
  id: string,
  payload: { number: string; floor: number; wing: string | null; type: RoomType; capacity: number; status: RoomStatus; notes: string | null }
): Promise<RoomDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      UPDATE rooms SET
        number   = ${payload.number},
        floor    = ${payload.floor},
        wing     = ${payload.wing},
        type     = ${payload.type},
        capacity = ${payload.capacity},
        status   = ${payload.status},
        notes    = ${payload.notes}
      WHERE id = ${id}
      RETURNING id, number, floor, wing, type, capacity, status, notes
    `
    return mapRoom((rows as Record<string, unknown>[])[0])
  }
  const { data, error } = await supabase.from('rooms').update({
    number: payload.number, floor: payload.floor, wing: payload.wing,
    type: payload.type, capacity: payload.capacity, status: payload.status, notes: payload.notes,
  }).eq('id', id).select('id, number, floor, wing, type, capacity, status, notes').single()
  if (error) throw new Error(error.message)
  return mapRoom(data as Record<string, unknown>)
}

export async function adminDeleteRoom(id: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`DELETE FROM rooms WHERE id = ${id}`
    return
  }
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

