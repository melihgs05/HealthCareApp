import { supabase } from '../lib/supabase'
import { isNeonConfigured, getNeonSql } from '../lib/neonClient'
import type {
  PersonnelTaskDTO,
  PersonnelPermissionDTO,
  PatientSummaryDTO,
  TestResultDTO,
  RoomDTO,
  AdmissionDTO,
  PeriodicControlDTO,
} from './types'

// Neon returns PostgreSQL date/timestamptz columns as JS Date objects.
function toISOStr(val: unknown): string {
  if (val instanceof Date) return val.toISOString()
  return String(val ?? '')
}
function toDateOnly(val: unknown): string | null {
  if (val == null) return null
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  if (typeof val === 'string') return val.slice(0, 10)
  return null
}

// ──────────────────────────────────────────────────────────
// Tasks assigned to this personnel
// ──────────────────────────────────────────────────────────
export async function fetchMyTasks(personnelId: string): Promise<PersonnelTaskDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT pt.id, pt.title, pt.description, pt.priority, pt.status, pt.due_date, pt.created_at,
             pt.assigned_to, pt.assigned_by, pt.patient_id,
             p1.name AS assignee_name,
             p2.name AS assigner_name,
             p3.name AS patient_name
      FROM personnel_tasks pt
      LEFT JOIN profiles p1 ON p1.id = pt.assigned_to
      LEFT JOIN profiles p2 ON p2.id = pt.assigned_by
      LEFT JOIN profiles p3 ON p3.id = pt.patient_id
      WHERE pt.assigned_to = ${personnelId} AND pt.status != 'cancelled'
      ORDER BY pt.created_at DESC
    `
    return rows.map((row) => ({
      id: row.id as string,
      assignedTo: row.assigned_to as string,
      assignedToName: (row.assignee_name as string) ?? '',
      assignedBy: row.assigned_by as string,
      assignedByName: (row.assigner_name as string) ?? '',
      patientId: row.patient_id as string | null,
      patientName: (row.patient_name as string) ?? null,
      title: row.title as string,
      description: row.description as string | null,
      priority: row.priority as PersonnelTaskDTO['priority'],
      status: row.status as PersonnelTaskDTO['status'],
      dueDate: toDateOnly(row.due_date),
      createdAt: toISOStr(row.created_at),
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
    .eq('assigned_to', personnelId)
    .not('status', 'in', '(cancelled)')
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

export async function updateTaskStatus(
  taskId: string,
  status: PersonnelTaskDTO['status'],
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`UPDATE personnel_tasks SET status = ${status} WHERE id = ${taskId}`
    return
  }
  const { error } = await supabase
    .from('personnel_tasks')
    .update({ status })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// Permissions for this subrole
// ──────────────────────────────────────────────────────────
export async function fetchMyPermissions(subrole: string): Promise<PersonnelPermissionDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT subrole, permission, granted
      FROM personnel_permissions
      WHERE subrole = ${subrole}
    `
    return rows.map((row) => ({
      subrole: row.subrole as string,
      permission: row.permission as string,
      granted: row.granted as boolean,
    }))
  }

  const { data, error } = await supabase
    .from('personnel_permissions')
    .select('subrole, permission, granted')
    .eq('subrole', subrole)
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    subrole: row.subrole as string,
    permission: row.permission as string,
    granted: row.granted as boolean,
  }))
}

export function hasPermission(permissions: PersonnelPermissionDTO[], key: string): boolean {
  return permissions.some((p) => p.permission === key && p.granted)
}

// ──────────────────────────────────────────────────────────
// Limited patient view (for nurse/lab)
// ──────────────────────────────────────────────────────────
export async function fetchLimitedPatientInfo(patientId: string): Promise<PatientSummaryDTO | null> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const profileRows = await sql`SELECT id, name FROM profiles WHERE id = ${patientId} LIMIT 1`
    if (!profileRows.length) return null
    const profile = profileRows[0]
    const patientRows = await sql`SELECT mrn, dob, insurance, primary_doctor_id FROM patients WHERE id = ${patientId} LIMIT 1`
    const patient = patientRows[0]
    return {
      id: profile.id as string,
      name: profile.name as string,
      mrn: (patient?.mrn as string) ?? '',
      dob: toDateOnly(patient?.dob) ?? '',
      insurance: (patient?.insurance as string) ?? null,
      primaryDoctorId: (patient?.primary_doctor_id as string) ?? null,
      lastVisit: '',
      nextAppt: '',
      status: 'Active',
      activeMedicationCount: 0,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', patientId)
    .single()
  if (!profile) return null

  const { data: patient } = await supabase
    .from('patients')
    .select('mrn, dob, insurance, primary_doctor_id')
    .eq('id', patientId)
    .single()

  return {
    id: profile.id,
    name: profile.name,
    mrn: patient?.mrn ?? '',
    dob: patient?.dob ?? '',
    insurance: patient?.insurance ?? null,
    primaryDoctorId: patient?.primary_doctor_id ?? null,
    lastVisit: '',
    nextAppt: '',
    status: 'Active',
    activeMedicationCount: 0,
  }
}

// ──────────────────────────────────────────────────────────
// Lab: manage test results
// ──────────────────────────────────────────────────────────
export async function fetchPendingLabTests(personnelId: string): Promise<TestResultDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const tasks = await sql`
      SELECT patient_id FROM personnel_tasks
      WHERE assigned_to = ${personnelId} AND status = 'pending'
    `
    const patientIds = tasks.map((t) => t.patient_id as string).filter(Boolean)
    if (patientIds.length === 0) {
      const rows = await sql`
        SELECT id, date, type, summary, status, file_url
        FROM test_results
        WHERE status = 'In progress'
        ORDER BY date DESC
      `
      return rows.map(mapTestResult)
    }
    const rows = await sql`
      SELECT id, date, type, summary, status, file_url
      FROM test_results
      WHERE patient_id = ANY(${patientIds}) AND status = 'In progress'
      ORDER BY date DESC
    `
    return rows.map(mapTestResult)
  }

  // Lab sees tests ordered by doctors where status = In progress
  // Also considers tasks assigned to this lab personnel
  const { data: tasks } = await supabase
    .from('personnel_tasks')
    .select('patient_id')
    .eq('assigned_to', personnelId)
    .eq('status', 'pending')

  const patientIds = (tasks ?? [])
    .map((t: Record<string, string | null>) => t.patient_id)
    .filter(Boolean) as string[]

  if (patientIds.length === 0) {
    // fallback: show all in-progress results
    const { data, error } = await supabase
      .from('test_results')
      .select('id, date, type, summary, status, file_url')
      .eq('status', 'In progress')
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapTestResult)
  }

  const { data, error } = await supabase
    .from('test_results')
    .select('id, date, type, summary, status, file_url')
    .in('patient_id', patientIds)
    .eq('status', 'In progress')
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapTestResult)
}

export async function updateTestResult(
  testId: string,
  summary: string,
  status: TestResultDTO['status'],
  fileUrl?: string,
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    if (fileUrl) {
      await sql`UPDATE test_results SET summary = ${summary}, status = ${status}, file_url = ${fileUrl} WHERE id = ${testId}`
    } else {
      await sql`UPDATE test_results SET summary = ${summary}, status = ${status} WHERE id = ${testId}`
    }
    return
  }
  const update: Record<string, unknown> = { summary, status }
  if (fileUrl) update.file_url = fileUrl
  const { error } = await supabase
    .from('test_results')
    .update(update)
    .eq('id', testId)
  if (error) throw new Error(error.message)
}

function mapTestResult(row: Record<string, unknown>): TestResultDTO {
  return {
    id: row.id as string,
    date: toDateOnly(row.date) ?? '',  
    type: row.type as string,
    summary: row.summary as string,
    status: row.status as TestResultDTO['status'],
    fileUrl: row.file_url as string | null,
  }
}

// ──────────────────────────────────────────────────────────
// Inpatient: Rooms
// ──────────────────────────────────────────────────────────
export async function fetchRooms(): Promise<RoomDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT r.id, r.number, r.floor, r.wing, r.type, r.capacity, r.status, r.notes,
             a.patient_id AS current_patient_id,
             p.name       AS current_patient_name
      FROM rooms r
      LEFT JOIN admissions a ON a.room_id = r.id AND a.status = 'active'
      LEFT JOIN profiles   p ON p.id = a.patient_id
      ORDER BY r.floor, r.number
    `
    return (rows as Record<string, unknown>[]).map(mapRoom)
  }

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id, number, floor, wing, type, capacity, status, notes,
      admissions!admissions_room_id_fkey(patient_id, status,
        profiles!admissions_patient_id_fkey(name))
    `)
    .order('floor').order('number')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => {
    const activeAdm = (r.admissions as Record<string, unknown>[] | null)
      ?.find((a) => a.status === 'active')
    const profile = activeAdm
      ? (activeAdm.profiles as { name: string } | null)
      : null
    return {
      id: r.id as string, number: r.number as string, floor: r.floor as number,
      wing: r.wing as string | null, type: r.type as RoomDTO['type'],
      capacity: r.capacity as number, status: r.status as RoomDTO['status'],
      notes: r.notes as string | null,
      currentPatientId: activeAdm?.patient_id as string | null ?? null,
      currentPatientName: profile?.name ?? null,
    }
  })
}

function mapRoom(row: Record<string, unknown>): RoomDTO {
  return {
    id: row.id as string,
    number: row.number as string,
    floor: row.floor as number,
    wing: row.wing as string | null,
    type: row.type as RoomDTO['type'],
    capacity: row.capacity as number,
    status: row.status as RoomDTO['status'],
    notes: row.notes as string | null,
    currentPatientId: (row.current_patient_id as string | null) ?? null,
    currentPatientName: (row.current_patient_name as string | null) ?? null,
  }
}

// ──────────────────────────────────────────────────────────
// Inpatient: Admissions
// ──────────────────────────────────────────────────────────
export async function fetchActiveAdmissions(): Promise<AdmissionDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT a.id, a.patient_id, a.room_id, a.admitted_by, a.primary_doctor_id,
             a.admission_type, a.diagnosis, a.notes, a.admitted_at,
             a.expected_discharge, a.discharged_at, a.status,
             p.name  AS patient_name,
             r.number AS room_number,
             doc.name AS doctor_name,
             adm.name AS admitter_name
      FROM admissions a
      LEFT JOIN profiles p   ON p.id   = a.patient_id
      LEFT JOIN rooms    r   ON r.id   = a.room_id
      LEFT JOIN profiles doc ON doc.id = a.primary_doctor_id
      LEFT JOIN profiles adm ON adm.id = a.admitted_by
      WHERE a.status = 'active'
      ORDER BY a.admitted_at DESC
    `
    return (rows as Record<string, unknown>[]).map(mapAdmission)
  }

  const { data, error } = await supabase
    .from('admissions')
    .select(`
      id, patient_id, room_id, admitted_by, primary_doctor_id,
      admission_type, diagnosis, notes, admitted_at, expected_discharge, discharged_at, status,
      patient:profiles!admissions_patient_id_fkey(name),
      room:rooms!admissions_room_id_fkey(number),
      doctor:profiles!admissions_primary_doctor_id_fkey(name),
      admitter:profiles!admissions_admitted_by_fkey(name)
    `)
    .eq('status', 'active')
    .order('admitted_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    patientId: r.patient_id as string,
    patientName: (r.patient as { name: string } | null)?.name ?? '',
    roomId: r.room_id as string | null,
    roomNumber: (r.room as { number: string } | null)?.number ?? null,
    admittedBy: r.admitted_by as string | null,
    admittedByName: (r.admitter as { name: string } | null)?.name ?? null,
    primaryDoctorId: r.primary_doctor_id as string | null,
    primaryDoctorName: (r.doctor as { name: string } | null)?.name ?? null,
    admissionType: r.admission_type as AdmissionDTO['admissionType'],
    diagnosis: r.diagnosis as string | null,
    notes: r.notes as string | null,
    admittedAt: toISOStr(r.admitted_at),
    expectedDischarge: toDateOnly(r.expected_discharge),
    dischargedAt: r.discharged_at != null ? toISOStr(r.discharged_at) : null,
    status: r.status as AdmissionDTO['status'],
  }))
}

function mapAdmission(row: Record<string, unknown>): AdmissionDTO {
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    patientName: (row.patient_name as string) ?? '',
    roomId: row.room_id as string | null,
    roomNumber: (row.room_number as string) ?? null,
    admittedBy: row.admitted_by as string | null,
    admittedByName: (row.admitter_name as string) ?? null,
    primaryDoctorId: row.primary_doctor_id as string | null,
    primaryDoctorName: (row.doctor_name as string) ?? null,
    admissionType: row.admission_type as AdmissionDTO['admissionType'],
    diagnosis: row.diagnosis as string | null,
    notes: row.notes as string | null,
    admittedAt: toISOStr(row.admitted_at),
    expectedDischarge: toDateOnly(row.expected_discharge),
    dischargedAt: row.discharged_at != null ? toISOStr(row.discharged_at) : null,
    status: row.status as AdmissionDTO['status'],
  }
}

export async function createAdmission(payload: {
  patientId: string
  roomId: string
  admittedBy: string
  primaryDoctorId?: string
  admissionType: AdmissionDTO['admissionType']
  diagnosis?: string
  notes?: string
  expectedDischarge?: string
}): Promise<AdmissionDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      INSERT INTO admissions
        (patient_id, room_id, admitted_by, primary_doctor_id,
         admission_type, diagnosis, notes, expected_discharge)
      VALUES
        (${payload.patientId}, ${payload.roomId}, ${payload.admittedBy},
         ${payload.primaryDoctorId ?? null}, ${payload.admissionType},
         ${payload.diagnosis ?? null}, ${payload.notes ?? null},
         ${payload.expectedDischarge ?? null})
      RETURNING id, patient_id, room_id, admitted_by, primary_doctor_id,
                admission_type, diagnosis, notes, admitted_at, expected_discharge,
                discharged_at, status
    `
    await sql`UPDATE rooms SET status = 'occupied' WHERE id = ${payload.roomId}`
    const row = (rows as Record<string, unknown>[])[0]
    return mapAdmission({ ...row, patient_name: '', room_number: null, doctor_name: null, admitter_name: null })
  }

  const { data, error } = await supabase.from('admissions').insert({
    patient_id: payload.patientId,
    room_id: payload.roomId,
    admitted_by: payload.admittedBy,
    primary_doctor_id: payload.primaryDoctorId ?? null,
    admission_type: payload.admissionType,
    diagnosis: payload.diagnosis ?? null,
    notes: payload.notes ?? null,
    expected_discharge: payload.expectedDischarge ?? null,
  }).select().single()
  if (error) throw new Error(error.message)
  await supabase.from('rooms').update({ status: 'occupied' }).eq('id', payload.roomId)
  return mapAdmission({ ...(data as Record<string, unknown>), patient_name: '', room_number: null, doctor_name: null, admitter_name: null })
}

export async function dischargePatient(admissionId: string, roomId: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`UPDATE admissions SET status = 'discharged', discharged_at = now() WHERE id = ${admissionId}`
    await sql`UPDATE rooms SET status = 'available' WHERE id = ${roomId}`
    return
  }
  await supabase.from('admissions').update({ status: 'discharged', discharged_at: new Date().toISOString() }).eq('id', admissionId)
  await supabase.from('rooms').update({ status: 'available' }).eq('id', roomId)
}

// ──────────────────────────────────────────────────────────
// Inpatient: Periodic Controls
// ──────────────────────────────────────────────────────────
export async function fetchPeriodicControls(admissionId: string): Promise<PeriodicControlDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT pc.id, pc.admission_id, pc.patient_id, pc.title, pc.description,
             pc.frequency_hours, pc.next_due, pc.doctor_id, pc.nurse_id,
             pc.created_by, pc.active, pc.created_at,
             doc.name AS doctor_name, nur.name AS nurse_name, pat.name AS patient_name
      FROM periodic_controls pc
      LEFT JOIN profiles doc ON doc.id = pc.doctor_id
      LEFT JOIN profiles nur ON nur.id = pc.nurse_id
      LEFT JOIN profiles pat ON pat.id = pc.patient_id
      WHERE pc.admission_id = ${admissionId} AND pc.active = true
      ORDER BY pc.next_due ASC
    `
    return (rows as Record<string, unknown>[]).map(mapControl)
  }

  const { data, error } = await supabase
    .from('periodic_controls')
    .select(`
      id, admission_id, patient_id, title, description, frequency_hours, next_due,
      doctor_id, nurse_id, created_by, active, created_at,
      doctor:profiles!periodic_controls_doctor_id_fkey(name),
      nurse:profiles!periodic_controls_nurse_id_fkey(name),
      patient:profiles!periodic_controls_patient_id_fkey(name)
    `)
    .eq('admission_id', admissionId)
    .eq('active', true)
    .order('next_due')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, admissionId: r.admission_id as string,
    patientId: r.patient_id as string,
    patientName: (r.patient as { name: string } | null)?.name ?? null,
    title: r.title as string, description: r.description as string | null,
    frequencyHours: r.frequency_hours as number, nextDue: r.next_due as string,
    doctorId: r.doctor_id as string | null,
    doctorName: (r.doctor as { name: string } | null)?.name ?? null,
    nurseId: r.nurse_id as string | null,
    nurseName: (r.nurse as { name: string } | null)?.name ?? null,
    createdBy: r.created_by as string, active: r.active as boolean,
    createdAt: r.created_at as string,
  }))
}

function mapControl(row: Record<string, unknown>): PeriodicControlDTO {
  return {
    id: row.id as string, admissionId: row.admission_id as string,
    patientId: row.patient_id as string,
    patientName: (row.patient_name as string) ?? null,
    title: row.title as string, description: row.description as string | null,
    frequencyHours: row.frequency_hours as number, nextDue: toISOStr(row.next_due),
    doctorId: row.doctor_id as string | null, doctorName: (row.doctor_name as string) ?? null,
    nurseId: row.nurse_id as string | null, nurseName: (row.nurse_name as string) ?? null,
    createdBy: row.created_by as string, active: row.active as boolean,
    createdAt: toISOStr(row.created_at),
  }
}

export async function createPeriodicControl(payload: {
  admissionId: string
  patientId: string
  title: string
  description?: string
  frequencyHours: number
  firstDue: string
  doctorId?: string
  nurseId?: string
  createdBy: string
}): Promise<PeriodicControlDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      INSERT INTO periodic_controls
        (admission_id, patient_id, title, description, frequency_hours,
         next_due, doctor_id, nurse_id, created_by)
      VALUES
        (${payload.admissionId}, ${payload.patientId}, ${payload.title},
         ${payload.description ?? null}, ${payload.frequencyHours}, ${payload.firstDue},
         ${payload.doctorId ?? null}, ${payload.nurseId ?? null}, ${payload.createdBy})
      RETURNING *
    `
    const row = (rows as Record<string, unknown>[])[0]
    // Auto-create first task for nurse if assigned
    if (payload.nurseId) {
      await sql`
        INSERT INTO personnel_tasks (assigned_to, assigned_by, patient_id, title, description, priority, due_date)
        VALUES (${payload.nurseId}, ${payload.createdBy}, ${payload.patientId},
                ${'Periodic Control: ' + payload.title}, ${payload.description ?? null},
                'high', ${payload.firstDue})
      `
    }
    // Auto-create first task for doctor if assigned
    if (payload.doctorId) {
      await sql`
        INSERT INTO personnel_tasks (assigned_to, assigned_by, patient_id, title, description, priority, due_date)
        VALUES (${payload.doctorId}, ${payload.createdBy}, ${payload.patientId},
                ${'Periodic Control: ' + payload.title}, ${payload.description ?? null},
                'high', ${payload.firstDue})
      `
    }
    return mapControl({ ...row, doctor_name: null, nurse_name: null, patient_name: null })
  }

  const { data, error } = await supabase.from('periodic_controls').insert({
    admission_id: payload.admissionId, patient_id: payload.patientId,
    title: payload.title, description: payload.description ?? null,
    frequency_hours: payload.frequencyHours, next_due: payload.firstDue,
    doctor_id: payload.doctorId ?? null, nurse_id: payload.nurseId ?? null,
    created_by: payload.createdBy,
  }).select().single()
  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  // Auto-create tasks
  const taskBase = {
    assigned_by: payload.createdBy, patient_id: payload.patientId,
    title: 'Periodic Control: ' + payload.title,
    description: payload.description ?? null, priority: 'high', due_date: payload.firstDue,
  }
  if (payload.nurseId) await supabase.from('personnel_tasks').insert({ ...taskBase, assigned_to: payload.nurseId })
  if (payload.doctorId) await supabase.from('personnel_tasks').insert({ ...taskBase, assigned_to: payload.doctorId })
  return mapControl({ ...row, doctor_name: null, nurse_name: null, patient_name: null })
}

// Fetch patients (for desk/nurse patient search)
export async function fetchAllPatients(): Promise<{ id: string; name: string; mrn: string }[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT p.id, p.name, pat.mrn
      FROM profiles p JOIN patients pat ON pat.id = p.id
      ORDER BY p.name LIMIT 200
    `
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, name: r.name as string, mrn: r.mrn as string,
    }))
  }
  const { data, error } = await supabase
    .from('profiles').select('id, name, patients!patients_id_fkey(mrn)')
    .eq('role', 'patient').order('name').limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, name: r.name as string,
    mrn: (r.patients as { mrn: string } | null)?.mrn ?? '',
  }))
}

// Fetch doctors (for control assignment)
export async function fetchAllDoctors(): Promise<{ id: string; name: string; specialty: string | null }[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT p.id, p.name, d.specialty
      FROM profiles p LEFT JOIN doctors d ON d.id = p.id
      WHERE p.role = 'doctor' ORDER BY p.name
    `
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, name: r.name as string, specialty: r.specialty as string | null,
    }))
  }
  const { data, error } = await supabase
    .from('profiles').select('id, name, doctors!doctors_id_fkey(specialty)')
    .eq('role', 'doctor').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, name: r.name as string,
    specialty: (r.doctors as { specialty: string | null } | null)?.specialty ?? null,
  }))
}

// Fetch nurses
export async function fetchAllNurses(): Promise<{ id: string; name: string }[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT id, name FROM profiles WHERE role = 'personnel' AND subrole = 'nurse' ORDER BY name
    `
    return (rows as Record<string, unknown>[]).map((r) => ({ id: r.id as string, name: r.name as string }))
  }
  const { data, error } = await supabase
    .from('profiles').select('id, name').eq('role', 'personnel').eq('subrole', 'nurse').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string }))
}
