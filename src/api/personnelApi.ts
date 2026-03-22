import { supabase } from '../lib/supabase'
import { isNeonConfigured, getNeonSql } from '../lib/neonClient'
import type {
  PersonnelTaskDTO,
  PersonnelPermissionDTO,
  PatientSummaryDTO,
  TestResultDTO,
} from './types'

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
      dob: (patient?.dob as string) ?? '',
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
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`UPDATE test_results SET summary = ${summary}, status = ${status} WHERE id = ${testId}`
    return
  }
  const { error } = await supabase
    .from('test_results')
    .update({ summary, status })
    .eq('id', testId)
  if (error) throw new Error(error.message)
}

function mapTestResult(row: Record<string, unknown>): TestResultDTO {
  return {
    id: row.id as string,
    date: row.date as string,
    type: row.type as string,
    summary: row.summary as string,
    status: row.status as TestResultDTO['status'],
    fileUrl: row.file_url as string | null,
  }
}
