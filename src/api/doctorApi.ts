import { supabase } from '../lib/supabase'

type NeonRow = Record<string, unknown>
import { isNeonConfigured, getNeonSql } from '../lib/neonClient'

/** Normalize a Neon/Postgres date value (Date object or string) to YYYY-MM-DD string */
function toDateString(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val ?? '')
}
import type {
  DoctorScheduleDTO,
  PatientSummaryDTO,
  MessageDTO,
  AppointmentDTO,
  DoctorAvailabilityDTO,
  BlockedTimeDTO,
  PatientNoteDTO,
  MedicationDTO,
  TestResultDTO,
  PrescriptionDTO,
} from './types'

// ──────────────────────────────────────────────────────────
// Schedule
// ──────────────────────────────────────────────────────────
export async function fetchTodaySchedule(doctorId: string): Promise<DoctorScheduleDTO[]> {
  const today = new Date().toISOString().slice(0, 10)

  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT a.id, a.time, a.type, a.status,
             p.id AS patient_id, p.name AS patient_name,
             d.consultation_room
      FROM appointments a
      LEFT JOIN profiles p ON p.id = a.patient_id
      LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE a.doctor_id = ${doctorId} AND a.date = ${today}
      ORDER BY a.time
    `
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      appointmentId: row.id as string,
      time: (row.time as string).slice(0, 5),
      patient: (row.patient_name as string) ?? 'Unknown',
      patientId: (row.patient_id as string) ?? '',
      reason: row.type as string,
      room: (row.consultation_room as string) ?? '',
      status: row.status as DoctorScheduleDTO['status'],
    }))
  }

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, time, type, status,
      patient:profiles!appointments_patient_id_fkey(id, name),
      doctors!appointments_doctor_id_fkey(consultation_room)
    `)
    .eq('doctor_id', doctorId)
    .eq('date', today)
    .order('time')
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const patient = row.patient as { id: string; name: string } | null
    const doc = row.doctors as { consultation_room: string | null } | null
    return {
      id: row.id as string,
      appointmentId: row.id as string,
      time: (row.time as string).slice(0, 5),
      patient: patient?.name ?? 'Unknown',
      patientId: patient?.id ?? '',
      reason: row.type as string,
      room: doc?.consultation_room ?? '',
      status: row.status as DoctorScheduleDTO['status'],
    }
  })
}

export async function fetchDoctorScheduleByDate(
  doctorId: string,
  date: string,
): Promise<DoctorScheduleDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT a.id, a.time, a.type, a.status,
             p.id AS patient_id, p.name AS patient_name,
             d.consultation_room
      FROM appointments a
      LEFT JOIN profiles p ON p.id = a.patient_id
      LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE a.doctor_id = ${doctorId} AND a.date = ${date}
      ORDER BY a.time
    `
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      appointmentId: row.id as string,
      time: (row.time as string).slice(0, 5),
      patient: (row.patient_name as string) ?? 'Unknown',
      patientId: (row.patient_id as string) ?? '',
      reason: row.type as string,
      room: (row.consultation_room as string) ?? '',
      status: row.status as DoctorScheduleDTO['status'],
    }))
  }

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, time, type, status,
      patient:profiles!appointments_patient_id_fkey(id, name),
      doctors!appointments_doctor_id_fkey(consultation_room)
    `)
    .eq('doctor_id', doctorId)
    .eq('date', date)
    .order('time')
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const patient = row.patient as { id: string; name: string } | null
    const doc = row.doctors as { consultation_room: string | null } | null
    return {
      id: row.id as string,
      appointmentId: row.id as string,
      time: (row.time as string).slice(0, 5),
      patient: patient?.name ?? 'Unknown',
      patientId: patient?.id ?? '',
      reason: row.type as string,
      room: doc?.consultation_room ?? '',
      status: row.status as DoctorScheduleDTO['status'],
    }
  })
}

// ──────────────────────────────────────────────────────────
// Patient List
// ──────────────────────────────────────────────────────────
export async function fetchPatientList(doctorId: string): Promise<PatientSummaryDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    // Single efficient query: primary patients UNION appointment-linked patients
    const patients = await sql`
      SELECT DISTINCT p.id, p.name,
        pat.mrn, pat.dob::text AS dob, pat.insurance,
        (SELECT a.date::text FROM appointments a
           WHERE a.patient_id = p.id AND a.status = 'Completed'
           ORDER BY a.date DESC LIMIT 1) AS last_visit,
        (SELECT a.date::text FROM appointments a
           WHERE a.patient_id = p.id AND a.status = 'Upcoming'
           ORDER BY a.date ASC  LIMIT 1) AS next_appt,
        (SELECT COUNT(*)::int FROM medications m
           WHERE m.patient_id = p.id AND m.active = true) AS med_count
      FROM profiles p
      JOIN patients pat ON pat.id = p.id
      WHERE pat.primary_doctor_id = ${doctorId}
         OR p.id IN (
           SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = ${doctorId}
         )
      ORDER BY p.name
    `
    return (patients as NeonRow[]).map((row) => ({
      id: row.id as string,
      name: (row.name as string) ?? 'Unknown',
      mrn: (row.mrn as string) ?? '',
      dob: (row.dob as string) ?? '',
      insurance: row.insurance as string | null,
      primaryDoctorId: doctorId,
      lastVisit: (row.last_visit as string) ?? '—',
      nextAppt: (row.next_appt as string) ?? '—',
      status: row.next_appt ? 'Follow-up' : 'Active',
      activeMedicationCount: Number(row.med_count ?? 0),
    }))
  }

  // Supabase: fetch primary patients + appointment-linked patients
  const [{ data: assignedPatients }, { data: apptPatients }] = await Promise.all([
    supabase
      .from('patients')
      .select('id, mrn, dob, insurance, profiles!patients_id_fkey(name)')
      .eq('primary_doctor_id', doctorId),
    supabase
      .from('appointments')
      .select('patient_id, patients!appointments_patient_id_fkey(id, mrn, dob, insurance, profiles!patients_id_fkey(name))')
      .eq('doctor_id', doctorId),
  ])

  // Deduplicate by patient id
  const patMap = new Map<string, Record<string, unknown>>()
  for (const p of assignedPatients ?? []) patMap.set(p.id as string, p as Record<string, unknown>)
  for (const a of apptPatients ?? []) {
    const p = a.patients as unknown as Record<string, unknown> | null
    if (p && !patMap.has(p.id as string)) patMap.set(p.id as string, p)
  }

  const results: PatientSummaryDTO[] = []
  for (const [, pat] of patMap) {
    const profile = (pat.profiles as unknown as { name: string } | null)

    const [{ data: lastAppt }, { data: nextAppt }, { count: medCount }] = await Promise.all([
      supabase.from('appointments').select('date').eq('patient_id', pat.id as string).eq('status', 'Completed').order('date', { ascending: false }).limit(1),
      supabase.from('appointments').select('date').eq('patient_id', pat.id as string).eq('status', 'Upcoming').order('date', { ascending: true }).limit(1),
      supabase.from('medications').select('id', { count: 'exact', head: true }).eq('patient_id', pat.id as string).eq('active', true),
    ])

    results.push({
      id: pat.id as string,
      name: profile?.name ?? 'Unknown',
      mrn: pat.mrn as string,
      dob: pat.dob as string,
      insurance: pat.insurance as string | null,
      primaryDoctorId: doctorId,
      lastVisit: lastAppt?.[0]?.date ?? '—',
      nextAppt: nextAppt?.[0]?.date ?? '—',
      status: nextAppt?.[0] ? 'Follow-up' : 'Active',
      activeMedicationCount: medCount ?? 0,
    })
  }

  results.sort((a, b) => a.name.localeCompare(b.name))
  return results
}

// ──────────────────────────────────────────────────────────
// Appointment management
// ──────────────────────────────────────────────────────────
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentDTO['status'],
  notes?: string,
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    if (notes !== undefined) {
      await sql`UPDATE appointments SET status = ${status}, notes = ${notes} WHERE id = ${appointmentId}`
    } else {
      await sql`UPDATE appointments SET status = ${status} WHERE id = ${appointmentId}`
    }
    return
  }
  const update: Record<string, string> = { status }
  if (notes !== undefined) update.notes = notes
  const { error } = await supabase.from('appointments').update(update).eq('id', appointmentId)
  if (error) throw new Error(error.message)
}

export async function fetchAppointmentById(appointmentId: string): Promise<AppointmentDTO | null> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT a.id, a.date, a.time, a.type, a.location, a.status, a.notes, a.doctor_id,
             p.name AS doctor_name
      FROM appointments a
      LEFT JOIN profiles p ON p.id = a.doctor_id
      WHERE a.id = ${appointmentId}
      LIMIT 1
    `
    const apptRows = rows as NeonRow[]
    if (!apptRows.length) return null
    const row = apptRows[0]
    return {
      id: row.id as string,
      date: toDateString(row.date),
      time: row.time as string,
      provider: (row.doctor_name as string) ?? '',
      providerId: row.doctor_id as string,
      type: row.type as string,
      location: (row.location as string) ?? '',
      status: row.status as AppointmentDTO['status'],
      notes: row.notes as string | null,
    }
  }

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, date, time, type, location, status, notes, doctor_id,
      doctor:profiles!appointments_doctor_id_fkey(name)
    `)
    .eq('id', appointmentId)
    .single()
  if (error) return null

  const doc = (data.doctor as unknown as { name: string } | null)
  return {
    id: data.id,
    date: data.date,
    time: data.time,
    provider: doc?.name ?? '',
    providerId: data.doctor_id,
    type: data.type,
    location: data.location ?? '',
    status: data.status,
    notes: data.notes,
  }
}

// ──────────────────────────────────────────────────────────
// Doctor's availability
// ──────────────────────────────────────────────────────────
export async function fetchDoctorAvailability(doctorId: string): Promise<DoctorAvailabilityDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT id, day_of_week, start_time, end_time, slot_duration_minutes
      FROM doctor_availability
      WHERE doctor_id = ${doctorId}
      ORDER BY day_of_week
    `
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      dayOfWeek: row.day_of_week as number,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      slotDurationMinutes: row.slot_duration_minutes as number,
    }))
  }

  const { data, error } = await supabase
    .from('doctor_availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('day_of_week')
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    slotDurationMinutes: row.slot_duration_minutes as number,
  }))
}

export async function upsertAvailability(
  doctorId: string,
  slot: Omit<DoctorAvailabilityDTO, 'id'>,
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`
      INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
      VALUES (${doctorId}, ${slot.dayOfWeek}, ${slot.startTime}, ${slot.endTime}, ${slot.slotDurationMinutes})
      ON CONFLICT (doctor_id, day_of_week, start_time)
      DO UPDATE SET end_time = EXCLUDED.end_time, slot_duration_minutes = EXCLUDED.slot_duration_minutes
    `
    return
  }
  const { error } = await supabase
    .from('doctor_availability')
    .upsert({
      doctor_id: doctorId,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      slot_duration_minutes: slot.slotDurationMinutes,
    }, { onConflict: 'doctor_id,day_of_week,start_time' })
  if (error) throw new Error(error.message)
}

export async function deleteAvailability(availabilityId: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`DELETE FROM doctor_availability WHERE id = ${availabilityId}`
    return
  }
  const { error } = await supabase.from('doctor_availability').delete().eq('id', availabilityId)
  if (error) throw new Error(error.message)
}

export async function fetchBlockedTimes(
  doctorId: string,
  monthStart?: string,
  monthEnd?: string,
): Promise<BlockedTimeDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = monthStart && monthEnd
      ? await sql`SELECT id, date, start_time, end_time, reason FROM doctor_blocked_times WHERE doctor_id = ${doctorId} AND date >= ${monthStart} AND date <= ${monthEnd} ORDER BY date`
      : monthStart
      ? await sql`SELECT id, date, start_time, end_time, reason FROM doctor_blocked_times WHERE doctor_id = ${doctorId} AND date >= ${monthStart} ORDER BY date`
      : monthEnd
      ? await sql`SELECT id, date, start_time, end_time, reason FROM doctor_blocked_times WHERE doctor_id = ${doctorId} AND date <= ${monthEnd} ORDER BY date`
      : await sql`SELECT id, date, start_time, end_time, reason FROM doctor_blocked_times WHERE doctor_id = ${doctorId} ORDER BY date`
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      date: toDateString(row.date),
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      reason: row.reason as string | null,
    }))
  }

  let query = supabase
    .from('doctor_blocked_times')
    .select('*')
    .eq('doctor_id', doctorId)
  if (monthStart) query = query.gte('date', monthStart)
  if (monthEnd) query = query.lte('date', monthEnd)
  const { data, error } = await query.order('date')
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: toDateString(row.date),
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    reason: row.reason as string | null,
  }))
}

export async function addBlockedTime(
  doctorId: string,
  entry: Omit<BlockedTimeDTO, 'id'>,
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`
      INSERT INTO doctor_blocked_times (doctor_id, date, start_time, end_time, reason)
      VALUES (${doctorId}, ${entry.date}, ${entry.startTime}, ${entry.endTime}, ${entry.reason ?? null})
    `
    return
  }
  const { error } = await supabase.from('doctor_blocked_times').insert({
    doctor_id: doctorId,
    date: entry.date,
    start_time: entry.startTime,
    end_time: entry.endTime,
    reason: entry.reason,
  })
  if (error) throw new Error(error.message)
}

export async function deleteBlockedTime(id: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`DELETE FROM doctor_blocked_times WHERE id = ${id}`
    return
  }
  const { error } = await supabase.from('doctor_blocked_times').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// Patient notes
// ──────────────────────────────────────────────────────────
export async function fetchPatientNotes(
  patientId: string,
  viewerRole: 'doctor' | 'admin' | 'lab' | 'nurse' | 'desk',
): Promise<PatientNoteDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT pn.id, pn.content, pn.author_id, pn.visibility, pn.appointment_id, pn.created_at,
             p.name AS author_name
      FROM patient_notes pn
      LEFT JOIN profiles p ON p.id = pn.author_id
      WHERE pn.patient_id = ${patientId}
      ORDER BY pn.created_at DESC
    `
    return (rows as NeonRow[])
      .map((row) => {
        let vis: string[]
        try {
          const raw = row.visibility
          vis = Array.isArray(raw) ? raw as string[] : JSON.parse(raw as string) as string[]
        } catch {
          vis = ['doctor']
        }
        return {
          id: row.id as string,
          content: row.content as string,
          authorId: row.author_id as string,
          authorName: (row.author_name as string) ?? 'Unknown',
          visibility: vis,
          appointmentId: row.appointment_id as string | null,
          createdAt: row.created_at as string,
        }
      })
      .filter((note) => viewerRole === 'admin' || note.visibility.includes(viewerRole))
  }

  const { data, error } = await supabase
    .from('patient_notes')
    .select('id, content, author_id, visibility, appointment_id, created_at, profiles!patient_notes_author_id_fkey(name)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const author = row.profiles as { name: string } | null
      let vis: string[]
      try {
        const raw = row.visibility
        vis = Array.isArray(raw) ? raw : JSON.parse(raw as string)
      } catch {
        vis = ['doctor']
      }
      return {
        id: row.id as string,
        content: row.content as string,
        authorId: row.author_id as string,
        authorName: author?.name ?? 'Unknown',
        visibility: vis,
        appointmentId: row.appointment_id as string | null,
        createdAt: row.created_at as string,
      }
    })
    .filter((note) => viewerRole === 'admin' || note.visibility.includes(viewerRole))
}

export async function createPatientNote(
  patientId: string,
  authorId: string,
  content: string,
  visibility: string[],
  appointmentId?: string | null,
): Promise<PatientNoteDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      INSERT INTO patient_notes (patient_id, author_id, content, visibility, appointment_id)
      VALUES (${patientId}, ${authorId}, ${content}, ${JSON.stringify(visibility)}, ${appointmentId ?? null})
      RETURNING id, content, author_id, visibility, appointment_id, created_at
    `
    const row = (rows as NeonRow[])[0]
    return {
      id: row.id as string,
      content: row.content as string,
      authorId: row.author_id as string,
      authorName: '',
      visibility: Array.isArray(row.visibility) ? row.visibility as string[] : JSON.parse((row.visibility as string) ?? '["doctor"]'),
      appointmentId: row.appointment_id as string | null,
      createdAt: row.created_at as string,
    }
  }

  const { data, error } = await supabase
    .from('patient_notes')
    .insert({
      patient_id: patientId,
      author_id: authorId,
      content,
      visibility: JSON.stringify(visibility),
      appointment_id: appointmentId ?? null,
    })
    .select('id, content, author_id, visibility, appointment_id, created_at')
    .single()
  if (error) throw new Error(error.message)

  return {
    id: data.id,
    content: data.content,
    authorId: data.author_id,
    authorName: '',
    visibility: Array.isArray(data.visibility) ? data.visibility : JSON.parse(data.visibility ?? '["doctor"]'),
    appointmentId: data.appointment_id,
    createdAt: data.created_at,
  }
}

// ──────────────────────────────────────────────────────────
// E-Prescribe
// ──────────────────────────────────────────────────────────
export async function createPrescription(payload: {
  doctorId: string
  patientId: string
  medicationName: string
  dosage: string
  schedule: string
  refills: number
  pharmacy?: string
  instructions: string
}): Promise<PrescriptionDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const medRows = await sql`
      INSERT INTO medications (patient_id, prescribed_by, name, dosage, schedule, active, start_date)
      VALUES (${payload.patientId}, ${payload.doctorId}, ${payload.medicationName}, ${payload.dosage}, ${payload.schedule}, true, ${new Date().toISOString().slice(0, 10)})
      RETURNING id
    `
    const medId = (medRows as NeonRow[])[0].id as string
    const rxRows = await sql`
      INSERT INTO prescriptions (medication_id, doctor_id, patient_id, issued_date, refills, pharmacy, instructions)
      VALUES (${medId}, ${payload.doctorId}, ${payload.patientId}, ${new Date().toISOString().slice(0, 10)}, ${payload.refills}, ${payload.pharmacy ?? null}, ${payload.instructions})
      RETURNING id, issued_date, refills, pharmacy, instructions
    `
    const rx = (rxRows as NeonRow[])[0]
    return {
      id: rx.id as string,
      medicationName: payload.medicationName,
      dosage: payload.dosage,
      doctorName: '',
      patientName: '',
      issuedDate: rx.issued_date as string,
      refills: rx.refills as number,
      pharmacy: rx.pharmacy as string | null,
      instructions: rx.instructions as string,
    }
  }

  // First create the medication record
  const { data: med, error: medErr } = await supabase
    .from('medications')
    .insert({
      patient_id: payload.patientId,
      prescribed_by: payload.doctorId,
      name: payload.medicationName,
      dosage: payload.dosage,
      schedule: payload.schedule,
      active: true,
      start_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single()
  if (medErr) throw new Error(medErr.message)

  // Then create the prescription
  const { data: rx, error: rxErr } = await supabase
    .from('prescriptions')
    .insert({
      medication_id: med.id,
      doctor_id: payload.doctorId,
      patient_id: payload.patientId,
      issued_date: new Date().toISOString().slice(0, 10),
      refills: payload.refills,
      pharmacy: payload.pharmacy ?? null,
      instructions: payload.instructions,
    })
    .select('id, issued_date, refills, pharmacy, instructions')
    .single()
  if (rxErr) throw new Error(rxErr.message)

  return {
    id: rx.id,
    medicationName: payload.medicationName,
    dosage: payload.dosage,
    doctorName: '',
    patientName: '',
    issuedDate: rx.issued_date,
    refills: rx.refills,
    pharmacy: rx.pharmacy,
    instructions: rx.instructions,
  }
}

// ──────────────────────────────────────────────────────────
// Doctor inbox (messages)
// ──────────────────────────────────────────────────────────
export async function fetchDoctorInbox(doctorId: string): Promise<MessageDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT m.id, m.subject, m.body, m.read, m.created_at, m.parent_id,
             m.from_user_id, m.to_user_id,
             p.name AS sender_name
      FROM messages m
      LEFT JOIN profiles p ON p.id = m.from_user_id
      WHERE m.to_user_id = ${doctorId} OR m.from_user_id = ${doctorId}
      ORDER BY m.created_at DESC
    `
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      fromId: row.from_user_id as string,
      from: (row.sender_name as string) ?? 'Unknown',
      toId: row.to_user_id as string,
      subject: row.subject as string,
      preview: ((row.body as string) ?? '').slice(0, 100),
      body: row.body as string,
      date: (row.created_at as string).slice(0, 10),
      read: row.read as boolean,
      parentId: row.parent_id as string | null,
    }))
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, subject, body, read, created_at, parent_id,
      from_user_id, to_user_id,
      sender:profiles!messages_from_user_id_fkey(name)
    `)
    .or(`to_user_id.eq.${doctorId},from_user_id.eq.${doctorId}`)
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
      date: (row.created_at as string).slice(0, 10),
      read: row.read as boolean,
      parentId: row.parent_id as string | null,
    }
  })
}

export async function replyToMessage(
  fromId: string,
  toId: string,
  parentId: string,
  body: string,
): Promise<MessageDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const parentRows = await sql`SELECT subject FROM messages WHERE id = ${parentId} LIMIT 1`
    const typedParent = (parentRows as NeonRow[])[0]
    const subject = typedParent ? `Re: ${typedParent.subject as string}` : 'Reply'
    const rows = await sql`
      INSERT INTO messages (from_user_id, to_user_id, subject, body, parent_id)
      VALUES (${fromId}, ${toId}, ${subject}, ${body}, ${parentId})
      RETURNING id, subject, body, read, created_at, from_user_id, to_user_id
    `
    const row = (rows as NeonRow[])[0]
    return {
      id: row.id as string,
      fromId: row.from_user_id as string,
      from: '',
      toId: row.to_user_id as string,
      subject: row.subject as string,
      preview: (row.body as string).slice(0, 100),
      body: row.body as string,
      date: (row.created_at as string).slice(0, 10),
      read: false,
    }
  }

  const { data: parent } = await supabase
    .from('messages')
    .select('subject')
    .eq('id', parentId)
    .single()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      from_user_id: fromId,
      to_user_id: toId,
      subject: parent ? `Re: ${parent.subject}` : 'Reply',
      body,
      parent_id: parentId,
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
    read: false,
  }
}

export async function markDoctorMessageRead(messageId: string): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`UPDATE messages SET read = true WHERE id = ${messageId}`
    return
  }
  await supabase.from('messages').update({ read: true }).eq('id', messageId)
}

// ──────────────────────────────────────────────────────────
// Patient chart data (for Open Chart)
// ──────────────────────────────────────────────────────────
export async function fetchPatientMedications(patientId: string): Promise<MedicationDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT m.id, m.name, m.dosage, m.schedule, m.active, m.notes,
             p.name AS prescribed_by_name
      FROM medications m
      LEFT JOIN profiles p ON p.id = m.prescribed_by
      WHERE m.patient_id = ${patientId}
      ORDER BY m.active DESC
    `
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      dosage: row.dosage as string,
      schedule: row.schedule as string,
      active: row.active as boolean,
      prescribedBy: (row.prescribed_by_name as string) ?? null,
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
    const doc = row.profiles as { name: string } | null
    return {
      id: row.id as string,
      name: row.name as string,
      dosage: row.dosage as string,
      schedule: row.schedule as string,
      active: row.active as boolean,
      prescribedBy: doc?.name ?? null,
      notes: row.notes as string | null,
    }
  })
}

export async function fetchPatientTestResults(patientId: string): Promise<TestResultDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT id, date, type, summary, status, file_url
      FROM test_results
      WHERE patient_id = ${patientId}
      ORDER BY date DESC
    `
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      date: toDateString(row.date),
      type: row.type as string,
      summary: row.summary as string,
      status: row.status as TestResultDTO['status'],
      fileUrl: row.file_url as string | null,
    }))
  }

  const { data, error } = await supabase
    .from('test_results')
    .select('id, date, type, summary, status, file_url')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: toDateString(row.date),
    type: row.type as string,
    summary: row.summary as string,
    status: row.status as TestResultDTO['status'],
    fileUrl: row.file_url as string | null,
  }))
}

export async function fetchPatientAppointmentHistory(
  patientId: string,
  doctorId: string,
): Promise<AppointmentDTO[]> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      SELECT id, date, time, type, location, status, notes, doctor_id
      FROM appointments
      WHERE patient_id = ${patientId} AND doctor_id = ${doctorId}
      ORDER BY date DESC
    `
    return (rows as NeonRow[]).map((row) => ({
      id: row.id as string,
      date: toDateString(row.date),
      time: row.time as string,
      provider: '',
      providerId: row.doctor_id as string,
      type: row.type as string,
      location: (row.location as string) ?? '',
      status: row.status as AppointmentDTO['status'],
      notes: row.notes as string | null,
    }))
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, time, type, location, status, notes, doctor_id')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: toDateString(row.date),
    time: row.time as string,
    provider: '',
    providerId: row.doctor_id as string,
    type: row.type as string,
    location: row.location as string ?? '',
    status: row.status as AppointmentDTO['status'],
    notes: row.notes as string | null,
  }))
}

export async function orderLabTest(payload: {
  patientId: string
  orderedBy: string
  testType: string
  summary?: string
}): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`
      INSERT INTO test_results (patient_id, ordered_by, date, type, summary, status)
      VALUES (${payload.patientId}, ${payload.orderedBy}, ${new Date().toISOString().slice(0, 10)}, ${payload.testType}, ${payload.summary ?? 'Ordered — awaiting results'}, 'In progress')
    `
    return
  }
  const { error } = await supabase.from('test_results').insert({
    patient_id: payload.patientId,
    ordered_by: payload.orderedBy,
    date: new Date().toISOString().slice(0, 10),
    type: payload.testType,
    summary: payload.summary ?? 'Ordered — awaiting results',
    status: 'In progress',
  })
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// Medication management
// ──────────────────────────────────────────────────────────
export async function addMedication(
  patientId: string,
  prescribedBy: string,
  payload: { name: string; dosage: string; schedule: string },
): Promise<MedicationDTO> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    const rows = await sql`
      INSERT INTO medications (patient_id, prescribed_by, name, dosage, schedule, active, start_date)
      VALUES (${patientId}, ${prescribedBy}, ${payload.name}, ${payload.dosage}, ${payload.schedule}, true, ${new Date().toISOString().slice(0, 10)})
      RETURNING id, name, dosage, schedule, active
    `
    const row = (rows as NeonRow[])[0]
    return {
      id: row.id as string,
      name: row.name as string,
      dosage: row.dosage as string,
      schedule: row.schedule as string,
      active: row.active as boolean,
    }
  }

  const { data, error } = await supabase
    .from('medications')
    .insert({
      patient_id: patientId,
      prescribed_by: prescribedBy,
      name: payload.name,
      dosage: payload.dosage,
      schedule: payload.schedule,
      active: true,
      start_date: new Date().toISOString().slice(0, 10),
    })
    .select('id, name, dosage, schedule, active')
    .single()
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    name: data.name,
    dosage: data.dosage,
    schedule: data.schedule,
    active: data.active,
  }
}

export async function updateMedication(
  medicationId: string,
  payload: { name?: string; dosage?: string; schedule?: string },
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    // Only update columns that were provided
    if (payload.name !== undefined && payload.dosage !== undefined && payload.schedule !== undefined) {
      await sql`UPDATE medications SET name = ${payload.name}, dosage = ${payload.dosage}, schedule = ${payload.schedule} WHERE id = ${medicationId}`
    } else if (payload.name !== undefined && payload.dosage !== undefined) {
      await sql`UPDATE medications SET name = ${payload.name}, dosage = ${payload.dosage} WHERE id = ${medicationId}`
    } else if (payload.name !== undefined && payload.schedule !== undefined) {
      await sql`UPDATE medications SET name = ${payload.name}, schedule = ${payload.schedule} WHERE id = ${medicationId}`
    } else if (payload.dosage !== undefined && payload.schedule !== undefined) {
      await sql`UPDATE medications SET dosage = ${payload.dosage}, schedule = ${payload.schedule} WHERE id = ${medicationId}`
    } else if (payload.name !== undefined) {
      await sql`UPDATE medications SET name = ${payload.name} WHERE id = ${medicationId}`
    } else if (payload.dosage !== undefined) {
      await sql`UPDATE medications SET dosage = ${payload.dosage} WHERE id = ${medicationId}`
    } else if (payload.schedule !== undefined) {
      await sql`UPDATE medications SET schedule = ${payload.schedule} WHERE id = ${medicationId}`
    }
    return
  }
  const { error } = await supabase.from('medications').update(payload).eq('id', medicationId)
  if (error) throw new Error(error.message)
}

export async function toggleMedicationActive(medicationId: string, active: boolean): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    if (!active) {
      await sql`UPDATE medications SET active = false, end_date = ${new Date().toISOString().slice(0, 10)} WHERE id = ${medicationId}`
    } else {
      await sql`UPDATE medications SET active = true WHERE id = ${medicationId}`
    }
    return
  }
  const update: Record<string, unknown> = { active }
  if (!active) update.end_date = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from('medications').update(update).eq('id', medicationId)
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────
// Test result status revision
// ──────────────────────────────────────────────────────────
export async function updateTestResultStatus(
  testResultId: string,
  status: import('./types').ResultStatus,
): Promise<void> {
  if (isNeonConfigured) {
    const sql = getNeonSql()
    await sql`UPDATE test_results SET status = ${status} WHERE id = ${testResultId}`
    return
  }
  const { error } = await supabase.from('test_results').update({ status }).eq('id', testResultId)
  if (error) throw new Error(error.message)
}

