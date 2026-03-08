// ──────────────────────────────────────────────────────────
// Shared API envelope types
// ──────────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T
  success: boolean
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number
  page: number
  pageSize: number
}

// ──────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'admin'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
}

export type LoginPayload = {
  email: string
  password: string
  role: UserRole
}

export type SignupPayload = {
  name: string
  email: string
  password: string
  role: UserRole
}

export type AuthResponse = ApiResponse<{ user: AuthUser; token: string }>

// ──────────────────────────────────────────────────────────
// Patient portal
// ──────────────────────────────────────────────────────────

export type PatientProfile = {
  id: string
  name: string
  dob: string
  mrn: string
  primaryCareProvider: string
  insurance: string
}

export type AppointmentStatus = 'Upcoming' | 'Completed' | 'Cancelled'

export type AppointmentDTO = {
  id: string
  date: string
  time: string
  provider: string
  type: string
  location: string
  status: AppointmentStatus
}

export type MedicationDTO = {
  id: string
  name: string
  dosage: string
  schedule: string
  active: boolean
}

export type ResultStatus = 'Normal' | 'Follow up' | 'In progress'

export type TestResultDTO = {
  id: string
  date: string
  type: string
  summary: string
  status: ResultStatus
}

export type ActivityType = 'Login' | 'Message' | 'Appointment' | 'Document'

export type ActivityItemDTO = {
  id: string
  date: string
  time: string
  type: ActivityType
  description: string
}

export type MessageDTO = {
  id: string
  from: string
  subject: string
  preview: string
  date: string
  read: boolean
}

export type NotificationDTO = {
  id: string
  type: 'info' | 'success' | 'warning' | 'alert'
  title: string
  message: string
  read: boolean
  timestamp: string
}

// ──────────────────────────────────────────────────────────
// Doctor
// ──────────────────────────────────────────────────────────

export type DoctorScheduleDTO = {
  id: string
  time: string
  patient: string
  patientId: string
  reason: string
  room: string
}

export type PatientSummaryDTO = {
  id: string
  name: string
  mrn: string
  lastVisit: string
  nextAppt: string
  status: 'Active' | 'Follow-up' | 'New'
}

// ──────────────────────────────────────────────────────────
// Admin
// ──────────────────────────────────────────────────────────

export type AdminMetricsDTO = {
  activePatients: number
  activeClinicians: number
  appointmentsThisWeek: number
  messagesLast24h: number
}

export type SystemEventDTO = {
  id: string
  message: string
  timestamp: string
  level: 'info' | 'warning' | 'error'
}

export type IntegrationStatus = 'Online' | 'Offline' | 'Degraded'

export type IntegrationDTO = {
  name: string
  status: IntegrationStatus
  lastChecked: string
}

export type AdminUserDTO = {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'Active' | 'Inactive' | 'Suspended'
  lastLogin: string
}
