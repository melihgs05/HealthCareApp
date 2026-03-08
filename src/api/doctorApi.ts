import { supabase } from '../lib/supabase'
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
  const { data: assignedPatients, error } = await supabase
    .from('patients')
    .select('id, mrn, dob, insurance, profiles!patients_id_fkey(name)')
    .eq('primary_doctor_id', doctorId)
  if (error) throw new Error(error.message)

  const results: PatientSummaryDTO[] = []
  for (const pat of assignedPatients ?? []) {
    const profile = (pat.profiles as unknown as { name: string } | null)

    const { data: lastAppt } = await supabase
      .from('appointments')
      .select('date, status')
      .eq('patient_id', pat.id)
      .eq('status', 'Completed')
      .order('date', { ascending: false })
      .limit(1)

    const { data: nextAppt } = await supabase
      .from('appointments')
      .select('date')
      .eq('patient_id', pat.id)
      .eq('status', 'Upcoming')
      .order('date', { ascending: true })
      .limit(1)

    const { count: medCount } = await supabase
      .from('medications')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', pat.id)
      .eq('active', true)

    const lastVisit = lastAppt?.[0]?.date ?? '—'
    const nextVisit = nextAppt?.[0]?.date ?? '—'
    const hasUpcoming = Boolean(nextAppt?.[0])
    const status: PatientSummaryDTO['status'] = hasUpcoming ? 'Follow-up' : 'Active'

    results.push({
      id: pat.id,
      name: profile?.name ?? 'Unknown',
      mrn: pat.mrn,
      dob: pat.dob,
      insurance: pat.insurance,
      primaryDoctorId: doctorId,
      lastVisit,
      nextAppt: nextVisit,
      status,
      activeMedicationCount: medCount ?? 0,
    })
  }

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
  const update: Record<string, string> = { status }
  if (notes !== undefined) update.notes = notes
  const { error } = await supabase.from('appointments').update(update).eq('id', appointmentId)
  if (error) throw new Error(error.message)
}

export async function fetchAppointmentById(appointmentId: string): Promise<AppointmentDTO | null> {
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
  const { error } = await supabase.from('doctor_availability').delete().eq('id', availabilityId)
  if (error) throw new Error(error.message)
}

export async function fetchBlockedTimes(
  doctorId: string,
  monthStart?: string,
  monthEnd?: string,
): Promise<BlockedTimeDTO[]> {
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
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    reason: row.reason as string | null,
  }))
}

export async function addBlockedTime(
  doctorId: string,
  entry: Omit<BlockedTimeDTO, 'id'>,
): Promise<void> {
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
  await supabase.from('messages').update({ read: true }).eq('id', messageId)
}

// ──────────────────────────────────────────────────────────
// Patient chart data (for Open Chart)
// ──────────────────────────────────────────────────────────
export async function fetchPatientMedications(patientId: string): Promise<MedicationDTO[]> {
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
  const { data, error } = await supabase
    .from('test_results')
    .select('id, date, type, summary, status, file_url')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: row.date as string,
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
  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, time, type, location, status, notes, doctor_id')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: row.date as string,
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
  const { error } = await supabase.from('medications').update(payload).eq('id', medicationId)
  if (error) throw new Error(error.message)
}

export async function toggleMedicationActive(medicationId: string, active: boolean): Promise<void> {
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
  const { error } = await supabase.from('test_results').update({ status }).eq('id', testResultId)
  if (error) throw new Error(error.message)
}

