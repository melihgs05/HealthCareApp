import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────
// Supabase client configuration
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
// ─────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'The app will run in demo mode. Add these values to your .env file to enable the real backend.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
)

/** Returns true when Supabase is properly configured */
export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey) &&
  supabaseUrl !== 'https://placeholder.supabase.co'

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: Partial<ProfileInsert> }
      patients: { Row: PatientRow; Insert: PatientInsert; Update: Partial<PatientInsert> }
      doctors: { Row: DoctorRow; Insert: DoctorInsert; Update: Partial<DoctorInsert> }
      appointments: { Row: AppointmentRow; Insert: AppointmentInsert; Update: Partial<AppointmentInsert> }
      doctor_availability: { Row: AvailabilityRow; Insert: AvailabilityInsert; Update: Partial<AvailabilityInsert> }
      doctor_blocked_times: { Row: BlockedTimeRow; Insert: BlockedTimeInsert; Update: Partial<BlockedTimeInsert> }
      medications: { Row: MedicationRow; Insert: MedicationInsert; Update: Partial<MedicationInsert> }
      prescriptions: { Row: PrescriptionRow; Insert: PrescriptionInsert; Update: Partial<PrescriptionInsert> }
      test_results: { Row: TestResultRow; Insert: TestResultInsert; Update: Partial<TestResultInsert> }
      messages: { Row: MessageRow; Insert: MessageInsert; Update: Partial<MessageInsert> }
      patient_notes: { Row: PatientNoteRow; Insert: PatientNoteInsert; Update: Partial<PatientNoteInsert> }
      activity_log: { Row: ActivityLogRow; Insert: ActivityLogInsert; Update: Partial<ActivityLogInsert> }
      notifications: { Row: NotificationRow; Insert: NotificationInsert; Update: Partial<NotificationInsert> }
      personnel_tasks: { Row: PersonnelTaskRow; Insert: PersonnelTaskInsert; Update: Partial<PersonnelTaskInsert> }
      personnel_permissions: { Row: PermissionRow; Insert: PermissionInsert; Update: Partial<PermissionInsert> }
      system_settings: { Row: SystemSettingRow; Insert: SystemSettingInsert; Update: Partial<SystemSettingInsert> }
    }
  }
}

export type ProfileRow = {
  id: string
  name: string
  email: string
  role: 'patient' | 'doctor' | 'admin' | 'personnel'
  subrole: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
}
export type ProfileInsert = Omit<ProfileRow, 'created_at'>

export type PatientRow = {
  id: string
  mrn: string
  dob: string
  insurance: string | null
  primary_doctor_id: string | null
  city: string | null
  address: string | null
}
export type PatientInsert = PatientRow

export type DoctorRow = {
  id: string
  specialty: string | null
  license_number: string | null
  bio: string | null
  consultation_room: string | null
}
export type DoctorInsert = DoctorRow

export type AppointmentRow = {
  id: string
  patient_id: string
  doctor_id: string
  date: string
  time: string
  type: string
  location: string | null
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'No-show'
  notes: string | null
  created_at: string
}
export type AppointmentInsert = Omit<AppointmentRow, 'id' | 'created_at'>

export type AvailabilityRow = {
  id: string
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
}
export type AvailabilityInsert = Omit<AvailabilityRow, 'id'>

export type BlockedTimeRow = {
  id: string
  doctor_id: string
  date: string
  start_time: string
  end_time: string
  reason: string | null
}
export type BlockedTimeInsert = Omit<BlockedTimeRow, 'id'>

export type MedicationRow = {
  id: string
  patient_id: string
  prescribed_by: string | null
  name: string
  dosage: string
  schedule: string
  active: boolean
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}
export type MedicationInsert = Omit<MedicationRow, 'id' | 'created_at'>

export type PrescriptionRow = {
  id: string
  medication_id: string
  doctor_id: string
  patient_id: string
  issued_date: string
  refills: number
  pharmacy: string | null
  instructions: string
  created_at: string
}
export type PrescriptionInsert = Omit<PrescriptionRow, 'id' | 'created_at'>

export type TestResultRow = {
  id: string
  patient_id: string
  ordered_by: string | null
  date: string
  type: string
  summary: string
  status: 'Normal' | 'Follow up' | 'In progress'
  file_url: string | null
  created_at: string
}
export type TestResultInsert = Omit<TestResultRow, 'id' | 'created_at'>

export type MessageRow = {
  id: string
  from_user_id: string
  to_user_id: string
  subject: string
  body: string
  read: boolean
  parent_id: string | null
  created_at: string
}
export type MessageInsert = Omit<MessageRow, 'id' | 'created_at'>

export type PatientNoteRow = {
  id: string
  patient_id: string
  author_id: string
  content: string
  visibility: 'doctor' | 'admin' | 'all'
  appointment_id: string | null
  created_at: string
}
export type PatientNoteInsert = Omit<PatientNoteRow, 'id' | 'created_at'>

export type ActivityLogRow = {
  id: string
  user_id: string
  type: string
  description: string
  created_at: string
}
export type ActivityLogInsert = Omit<ActivityLogRow, 'id' | 'created_at'>

export type NotificationRow = {
  id: string
  user_id: string
  type: 'info' | 'success' | 'warning' | 'alert'
  title: string
  message: string
  read: boolean
  created_at: string
}
export type NotificationInsert = Omit<NotificationRow, 'id' | 'created_at'>

export type PersonnelTaskRow = {
  id: string
  assigned_to: string
  assigned_by: string
  patient_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string | null
  created_at: string
}
export type PersonnelTaskInsert = Omit<PersonnelTaskRow, 'id' | 'created_at'>

export type PermissionRow = {
  id: string
  subrole: string
  permission: string
  granted: boolean
  updated_by: string | null
  updated_at: string
}
export type PermissionInsert = Omit<PermissionRow, 'id' | 'updated_at'>

export type SystemSettingRow = {
  key: string
  value: string
  updated_at: string
}
export type SystemSettingInsert = Omit<SystemSettingRow, 'updated_at'>
