import { supabase } from '../lib/supabase'
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
// Patient Profile
// ──────────────────────────────────────────────────────────
export async function fetchPatientProfile(patientId: string): Promise<PatientProfile> {
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

  const [{ data: avail }, { data: blocked }, { data: booked }] = await Promise.all([
    supabase
      .from('doctor_availability')
      .select('start_time, end_time, slot_duration_minutes')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek),
    supabase
      .from('doctor_blocked_times')
      .select('start_time, end_time')
      .eq('doctor_id', doctorId)
      .eq('date', date),
    supabase
      .from('appointments')
      .select('time')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .in('status', ['Upcoming']),
  ])

  const slots: DoctorAvailabilitySlot[] = []
  for (const window of avail ?? []) {
    const slotMinutes = window.slot_duration_minutes ?? 30
    let [sh, sm] = (window.start_time as string).split(':').map(Number)
    const [eh, em] = (window.end_time as string).split(':').map(Number)
    const endTotal = eh * 60 + em

    while (sh * 60 + sm < endTotal) {
      const timeStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`
      const isBlocked = (blocked ?? []).some((b: Record<string, string>) => {
        const bStart = b.start_time.slice(0, 5)
        const bEnd = b.end_time.slice(0, 5)
        return timeStr >= bStart && timeStr < bEnd
      })
      const isBooked = (booked ?? []).some((a: Record<string, string>) => a.time.slice(0, 5) === timeStr)

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
  await supabase.from('activity_log').insert({ user_id: userId, type, description })
}

// ──────────────────────────────────────────────────────────
// Messages
// ──────────────────────────────────────────────────────────
export async function fetchMessages(patientId: string): Promise<MessageDTO[]> {
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
      date: (row.created_at as string).slice(0, 10),
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
  await supabase.from('messages').update({ read: true }).eq('id', messageId)
}

// ──────────────────────────────────────────────────────────
// Prescriptions (patient view)
// ──────────────────────────────────────────────────────────
export async function fetchPrescriptions(patientId: string): Promise<PrescriptionDTO[]> {
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

