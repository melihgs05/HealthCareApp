import { supabase } from '../lib/supabase'
import { isNeonConfigured, getNeonSql } from '../lib/neonClient'
import type {
  PatientProfile,
  AppointmentDTO,
  MedicationDTO,
  TestResultDTO,
  ActivityItemDTO,
  MessageDTO,
  PrescriptionDTO,
  DoctorInfoDTO,
  DoctorAvailabilitySlot,
} from './types'

// ──────────────────────────────────────────────────────────
// Neon returns PostgreSQL DATE/TIMESTAMPTZ columns as JS Date objects.
// This helper safely converts them to YYYY-MM-DD strings.
// ──────────────────────────────────────────────────────────
function toDateStr(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  if (typeof val === 'string') return val.slice(0, 10)
  return ''
}

// ──────────────────────────────────────────────────────────
// Patient Profile
// ──────────────────────────────────────────────────────────
export async function fetchPatientProfile(patientId: string): Promise<PatientProfile> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT p.id, p.name, p.email, pt.mrn, pt.dob, pt.insurance, pt.primary_doctor_id,
             d.name AS doctor_name
      FROM profiles p
      LEFT JOIN patients pt ON pt.id = p.id
      LEFT JOIN profiles d ON d.id = pt.primary_doctor_id
      WHERE p.id = ${patientId}
      LIMIT 1
    `
    if (!rows.length) throw new Error('User profile not found')
    const row = rows[0]
    return {
      id: row.id as string,
      name: row.name as string,
      dob: toDateStr(row.dob),
      mrn: (row.mrn as string | null) ?? '',
      primaryCareProvider: (row.doctor_name as string | null) ?? '',
      insurance: (row.insurance as string | null) ?? '',
    }
  }

  const { data: profile, error: pe } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('id', patientId)
    .single()
  if (pe) throw new Error(pe.message)

  const { data: patient, error: pate } = await supabase
    .from('patients')
    .select('mrn, dob, insurance, primary_doctor_id')
    .eq('id', patientId)
    .single()
  if (pate) throw new Error(pate.message)

  let providerName = ''
  if (patient.primary_doctor_id) {
    const { data: doc } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', patient.primary_doctor_id)
      .single()
    providerName = doc?.name ?? ''
  }

  return {
    id: profile.id,
    name: profile.name,
    dob: patient.dob,
    mrn: patient.mrn,
    primaryCareProvider: providerName,
    insurance: patient.insurance ?? '',
  }
}

// ──────────────────────────────────────────────────────────
// Appointments
// ──────────────────────────────────────────────────────────
export async function fetchAppointments(patientId: string): Promise<AppointmentDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT a.id, a.date, a.time, a.type, a.location, a.status, a.notes, a.doctor_id,
             d.name AS doctor_name
      FROM appointments a
      LEFT JOIN profiles d ON d.id = a.doctor_id
      WHERE a.patient_id = ${patientId}
      ORDER BY a.date DESC
    `
    return rows.map((row) => ({
      id: row.id as string,
      date: toDateStr(row.date),
      time: (row.time as string | null) ?? '',
      provider: (row.doctor_name as string | null) ?? '',
      providerId: row.doctor_id as string,
      type: row.type as string,
      location: (row.location as string | null) ?? '',
      status: row.status as AppointmentDTO['status'],
      notes: row.notes as string | null,
    }))
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, time, type, location, status, notes, doctor_id, profiles!appointments_doctor_id_fkey(name)')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const docProfile = row.profiles as { name: string } | null
    return {
      id: row.id as string,
      date: row.date as string,
      time: row.time as string,
      provider: docProfile?.name ?? '',
      providerId: row.doctor_id as string,
      type: row.type as string,
      location: row.location as string ?? '',
      status: row.status as AppointmentDTO['status'],
      notes: row.notes as string | null,
    }
  })
}

export async function bookAppointment(payload: {
  patientId: string
  doctorId: string
  date: string
  time: string
  type: string
  location?: string
}): Promise<AppointmentDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      INSERT INTO appointments (patient_id, doctor_id, date, time, type, location, status)
      VALUES (${payload.patientId}, ${payload.doctorId}, ${payload.date}, ${payload.time},
              ${payload.type}, ${payload.location ?? ''}, 'Upcoming')
      RETURNING id, date, time, type, location, status, doctor_id
    `
    const row = rows[0]
    const docRows = await sql`SELECT name FROM profiles WHERE id = ${payload.doctorId} LIMIT 1`
    return {
      id: row.id as string,
      date: toDateStr(row.date),
      time: (row.time as string | null) ?? '',
      provider: (docRows[0]?.name as string | null) ?? '',
      providerId: row.doctor_id as string,
      type: row.type as string,
      location: (row.location as string | null) ?? '',
      status: row.status as AppointmentDTO['status'],
    }
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: payload.patientId,
      doctor_id: payload.doctorId,
      date: payload.date,
      time: payload.time,
      type: payload.type,
      location: payload.location ?? '',
      status: 'Upcoming',
    })
    .select('id, date, time, type, location, status, doctor_id, profiles!appointments_doctor_id_fkey(name)')
    .single()
  if (error) throw new Error(error.message)

  const docProfile = (data.profiles as unknown as { name: string } | null)
  return {
    id: data.id,
    date: data.date,
    time: data.time,
    provider: docProfile?.name ?? '',
    providerId: data.doctor_id,
    type: data.type,
    location: data.location ?? '',
    status: data.status,
  }
}

// ──────────────────────────────────────────────────────────
// Doctor list & availability (for appointment booking)
// ──────────────────────────────────────────────────────────
export async function fetchDoctors(): Promise<DoctorInfoDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT p.id, p.name, d.specialty, d.consultation_room
      FROM profiles p
      LEFT JOIN doctors d ON d.id = p.id
      WHERE p.role = 'doctor'
      ORDER BY p.name
    `
    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      specialty: (row.specialty as string | null) ?? null,
      consultationRoom: (row.consultation_room as string | null) ?? null,
      availableDays: [],
    }))
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, doctors(specialty, consultation_room)')
    .eq('role', 'doctor')
    .order('name')
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const docInfo = row.doctors as { specialty: string | null; consultation_room: string | null } | null
    return {
      id: row.id as string,
      name: row.name as string,
      specialty: docInfo?.specialty ?? null,
      consultationRoom: docInfo?.consultation_room ?? null,
      availableDays: [],
    }
  })
}

export async function fetchDoctorAvailableSlots(
  doctorId: string,
  date: string,
): Promise<DoctorAvailabilitySlot[]> {
  const dayOfWeek = new Date(date).getDay()

  let avail: { start_time: string; end_time: string; slot_duration_minutes: number }[] = []
  let blocked: { start_time: string; end_time: string }[] = []
  let booked: { time: string }[] = []

  if (isNeonConfigured) {
    const sql = getNeonSql()
    ;[avail, blocked, booked] = await Promise.all([
      sql`SELECT start_time, end_time, slot_duration_minutes FROM doctor_availability WHERE doctor_id = ${doctorId} AND day_of_week = ${dayOfWeek}`,
      sql`SELECT start_time, end_time FROM doctor_blocked_times WHERE doctor_id = ${doctorId} AND date = ${date}`,
      sql`SELECT time FROM appointments WHERE doctor_id = ${doctorId} AND date = ${date} AND status = 'Upcoming'`,
    ]) as [typeof avail, typeof blocked, typeof booked]
  } else {
    const [ra, rb, rc] = await Promise.all([
      supabase.from('doctor_availability').select('start_time, end_time, slot_duration_minutes').eq('doctor_id', doctorId).eq('day_of_week', dayOfWeek),
      supabase.from('doctor_blocked_times').select('start_time, end_time').eq('doctor_id', doctorId).eq('date', date),
      supabase.from('appointments').select('time').eq('doctor_id', doctorId).eq('date', date).in('status', ['Upcoming']),
    ])
    avail = (ra.data ?? []) as typeof avail
    blocked = (rb.data ?? []) as typeof blocked
    booked = (rc.data ?? []) as typeof booked
  }

  const slots: DoctorAvailabilitySlot[] = []
  for (const window of avail) {
    const slotMinutes = window.slot_duration_minutes ?? 30
    let [sh, sm] = (window.start_time as string).split(':').map(Number)
    const [eh, em] = (window.end_time as string).split(':').map(Number)
    const endTotal = eh * 60 + em

    while (sh * 60 + sm < endTotal) {
      const timeStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`
      const isBlocked = blocked.some((b) => {
        const bStart = b.start_time.slice(0, 5)
        const bEnd = b.end_time.slice(0, 5)
        return timeStr >= bStart && timeStr < bEnd
      })
      const isBooked = booked.some((a) => a.time.slice(0, 5) === timeStr)

      slots.push({ time: timeStr, available: !isBlocked && !isBooked })
      sm += slotMinutes
      if (sm >= 60) { sh += Math.floor(sm / 60); sm = sm % 60 }
    }
  }

  return slots
}

// ──────────────────────────────────────────────────────────
// Medications
// ──────────────────────────────────────────────────────────
export async function fetchMedications(patientId: string): Promise<MedicationDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT m.id, m.name, m.dosage, m.schedule, m.active, m.notes, d.name AS doctor_name
      FROM medications m
      LEFT JOIN profiles d ON d.id = m.prescribed_by
      WHERE m.patient_id = ${patientId}
      ORDER BY m.active DESC
    `
    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      dosage: row.dosage as string,
      schedule: row.schedule as string,
      active: row.active as boolean,
      prescribedBy: (row.doctor_name as string | null) ?? null,
      notes: row.notes as string | null,
    }))
  }

  const { data, error } = await supabase
    .from('medications')
    .select('id, name, dosage, schedule, active, notes, profiles!medications_prescribed_by_fkey(name)')
    .eq('patient_id', patientId)
    .order('active', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const docProfile = row.profiles as { name: string } | null
    return {
      id: row.id as string,
      name: row.name as string,
      dosage: row.dosage as string,
      schedule: row.schedule as string,
      active: row.active as boolean,
      prescribedBy: docProfile?.name ?? null,
      notes: row.notes as string | null,
    }
  })
}

// ──────────────────────────────────────────────────────────
// Test Results
// ──────────────────────────────────────────────────────────
export async function fetchTestResults(patientId: string): Promise<TestResultDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT tr.id, tr.date, tr.type, tr.summary, tr.status, tr.file_url, d.name AS doctor_name
      FROM test_results tr
      LEFT JOIN profiles d ON d.id = tr.ordered_by
      WHERE tr.patient_id = ${patientId}
      ORDER BY tr.date DESC
    `
    return rows.map((row) => ({
      id: row.id as string,
      date: toDateStr(row.date),
      type: row.type as string,
      summary: row.summary as string,
      status: row.status as TestResultDTO['status'],
      orderedBy: (row.doctor_name as string | null) ?? null,
      fileUrl: (row.file_url as string | null) ?? null,
    }))
  }

  const { data, error } = await supabase
    .from('test_results')
    .select('id, date, type, summary, status, file_url, profiles!test_results_ordered_by_fkey(name)')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const orderedBy = row.profiles as { name: string } | null
    return {
      id: row.id as string,
      date: row.date as string,
      type: row.type as string,
      summary: row.summary as string,
      status: row.status as TestResultDTO['status'],
      orderedBy: orderedBy?.name ?? null,
      fileUrl: row.file_url as string | null,
    }
  })
}

// ──────────────────────────────────────────────────────────
// Activity Log
// ──────────────────────────────────────────────────────────
export async function fetchActivityLog(patientId: string): Promise<ActivityItemDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT id, type, description, created_at
      FROM activity_log
      WHERE user_id = ${patientId}
      ORDER BY created_at DESC
      LIMIT 50
    `
    return rows.map((row) => {
      const dt = new Date(row.created_at as string)
      return {
        id: row.id as string,
        date: dt.toISOString().slice(0, 10),
        time: dt.toTimeString().slice(0, 5),
        type: row.type as ActivityItemDTO['type'],
        description: row.description as string,
      }
    })
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, type, description, created_at')
    .eq('user_id', patientId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const dt = new Date(row.created_at as string)
    return {
      id: row.id as string,
      date: dt.toISOString().slice(0, 10),
      time: dt.toTimeString().slice(0, 5),
      type: row.type as ActivityItemDTO['type'],
      description: row.description as string,
    }
  })
}

export async function logActivity(userId: string, type: string, description: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`INSERT INTO activity_log (user_id, type, description) VALUES (${userId}, ${type}, ${description})`
    return
  }
  await supabase.from('activity_log').insert({ user_id: userId, type, description })
}

// ──────────────────────────────────────────────────────────
// Messages
// ──────────────────────────────────────────────────────────
export async function fetchMessages(patientId: string): Promise<MessageDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT m.id, m.subject, m.body, m.read, m.created_at, m.parent_id,
             m.from_user_id, m.to_user_id, s.name AS sender_name
      FROM messages m
      LEFT JOIN profiles s ON s.id = m.from_user_id
      WHERE m.from_user_id = ${patientId} OR m.to_user_id = ${patientId}
      ORDER BY m.created_at DESC
    `
    return rows.map((row) => ({
      id: row.id as string,
      fromId: row.from_user_id as string,
      from: (row.sender_name as string | null) ?? 'Unknown',
      toId: row.to_user_id as string,
      subject: row.subject as string,
      preview: ((row.body as string) ?? '').slice(0, 100),
      body: row.body as string,
      date: toDateStr(row.created_at),
      read: row.read as boolean,
      parentId: row.parent_id as string | null,
    }))
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, subject, body, read, created_at, parent_id,
      from_user_id, to_user_id,
      sender:profiles!messages_from_user_id_fkey(name),
      recipient:profiles!messages_to_user_id_fkey(name)
    `)
    .or(`from_user_id.eq.${patientId},to_user_id.eq.${patientId}`)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const sender = row.sender as { name: string } | null
    return {
      id: row.id as string,
      fromId: row.from_user_id as string,
      from: sender?.name ?? 'Unknown',
      toId: row.to_user_id as string,
      subject: row.subject as string,
      preview: ((row.body as string) ?? '').slice(0, 100),
      body: row.body as string,
      date: toDateStr(row.created_at),
      read: row.read as boolean,
      parentId: row.parent_id as string | null,
    }
  })
}

export async function sendMessage(
  fromId: string,
  toId: string,
  payload: { subject: string; body: string; parentId?: string },
): Promise<MessageDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      INSERT INTO messages (from_user_id, to_user_id, subject, body, parent_id)
      VALUES (${fromId}, ${toId}, ${payload.subject}, ${payload.body}, ${payload.parentId ?? null})
      RETURNING id, subject, body, read, created_at, from_user_id, to_user_id
    `
    const row = rows[0]
    return {
      id: row.id as string,
      fromId: row.from_user_id as string,
      from: '',
      toId: row.to_user_id as string,
      subject: row.subject as string,
      preview: (row.body as string).slice(0, 100),
      body: row.body as string,
      date: toDateStr(row.created_at),
      read: row.read as boolean,
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      from_user_id: fromId,
      to_user_id: toId,
      subject: payload.subject,
      body: payload.body,
      parent_id: payload.parentId ?? null,
    })
    .select('id, subject, body, read, created_at, from_user_id, to_user_id')
    .single()
  if (error) throw new Error(error.message)

  return {
    id: data.id,
    fromId: data.from_user_id,
    from: '',
    toId: data.to_user_id,
    subject: data.subject,
    preview: data.body.slice(0, 100),
    body: data.body,
    date: data.created_at.slice(0, 10),
    read: data.read,
  }
}

export async function markMessageRead(messageId: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`UPDATE messages SET read = true WHERE id = ${messageId}`
    return
  }
  await supabase.from('messages').update({ read: true }).eq('id', messageId)
}

// ──────────────────────────────────────────────────────────
// Prescriptions (patient view)
// ──────────────────────────────────────────────────────────
export async function fetchPrescriptions(patientId: string): Promise<PrescriptionDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT pr.id, pr.issued_date, pr.refills, pr.pharmacy, pr.instructions,
             d.name AS doctor_name, p.name AS patient_name, m.name AS med_name, m.dosage
      FROM prescriptions pr
      LEFT JOIN profiles d ON d.id = pr.doctor_id
      LEFT JOIN profiles p ON p.id = pr.patient_id
      LEFT JOIN medications m ON m.id = pr.medication_id
      WHERE pr.patient_id = ${patientId}
      ORDER BY pr.issued_date DESC
    `
    return rows.map((row) => ({
      id: row.id as string,
      medicationName: (row.med_name as string | null) ?? '',
      dosage: (row.dosage as string | null) ?? '',
      doctorName: (row.doctor_name as string | null) ?? '',
      patientName: (row.patient_name as string | null) ?? '',
      issuedDate: row.issued_date as string,
      refills: row.refills as number,
      pharmacy: row.pharmacy as string | null,
      instructions: row.instructions as string,
    }))
  }

  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id, issued_date, refills, pharmacy, instructions,
      doctor:profiles!prescriptions_doctor_id_fkey(name),
      patient:profiles!prescriptions_patient_id_fkey(name),
      medication:medications(name, dosage)
    `)
    .eq('patient_id', patientId)
    .order('issued_date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const doc = row.doctor as { name: string } | null
    const pat = row.patient as { name: string } | null
    const med = row.medication as { name: string; dosage: string } | null
    return {
      id: row.id as string,
      medicationName: med?.name ?? '',
      dosage: med?.dosage ?? '',
      doctorName: doc?.name ?? '',
      patientName: pat?.name ?? '',
      issuedDate: row.issued_date as string,
      refills: row.refills as number,
      pharmacy: row.pharmacy as string | null,
      instructions: row.instructions as string,
    }
  })
}

