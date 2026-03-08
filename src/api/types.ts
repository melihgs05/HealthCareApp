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

export type UserRole = 'patient' | 'doctor' | 'admin' | 'personnel'
export type PersonnelSubrole = 'lab' | 'nurse' | 'desk'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  subrole?: PersonnelSubrole | null
  avatarUrl?: string
  phone?: string
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
  subrole?: PersonnelSubrole
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

export type AppointmentStatus = 'Upcoming' | 'Completed' | 'Cancelled' | 'No-show'

export type AppointmentDTO = {
  id: string
  date: string
  time: string
  provider: string
  providerId: string
  type: string
  location: string
  status: AppointmentStatus
  notes?: string | null
  patientId?: string | null
  patientName?: string | null
}

export type MedicationDTO = {
  id: string
  name: string
  dosage: string
  schedule: string
  active: boolean
  prescribedBy?: string | null
  notes?: string | null
}

export type PrescriptionDTO = {
  id: string
  medicationName: string
  dosage: string
  doctorName: string
  patientName: string
  issuedDate: string
  refills: number
  pharmacy?: string | null
  instructions: string
}

export type ResultStatus = 'Normal' | 'Follow up' | 'In progress'

export type BloodTestItem = {
  name: string
  value: string
  unit: string
  refMin?: number
  refMax?: number
  flag?: 'H' | 'L' | 'N'
}

export type TestAttachment = {
  id: string
  type: 'image' | 'video' | 'pdf'
  url: string
  filename: string
}

export type TestResultDTO = {
  id: string
  date: string
  type: string
  summary: string
  status: ResultStatus
  orderedBy?: string | null
  fileUrl?: string | null
  items?: BloodTestItem[]
  attachments?: TestAttachment[]
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
  fromId: string
  from: string
  toId: string
  to?: string
  subject: string
  preview?: string
  body?: string
  date: string
  read: boolean
  parentId?: string | null
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
  status: AppointmentStatus
  appointmentId: string
}

export type DoctorInfoDTO = {
  id: string
  name: string
  specialty: string | null
  consultationRoom: string | null
  availableDays: number[]
}

export type DoctorAvailabilitySlot = {
  time: string
  available: boolean
}

export type PatientSummaryDTO = {
  id: string
  name: string
  mrn: string
  dob: string
  insurance: string | null
  primaryDoctorId: string | null
  lastVisit: string
  nextAppt: string
  status: 'Active' | 'Follow-up' | 'New'
  activeMedicationCount: number
}

export type PatientNoteDTO = {
  id: string
  content: string
  authorId: string
  authorName: string
  /** Array of audience keys: 'doctor' | 'admin' | 'patient' | 'lab' | 'nurse' | 'desk' */
  visibility: string[]
  appointmentId?: string | null
  createdAt: string
}

export type DoctorAvailabilityDTO = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
}

export type BlockedTimeDTO = {
  id: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
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
  subrole?: string | null
  status: 'Active' | 'Inactive' | 'Suspended'
  lastLogin: string
}

// ──────────────────────────────────────────────────────────
// Healthcare Personnel
// ──────────────────────────────────────────────────────────

export type PersonnelTaskDTO = {
  id: string
  assignedTo: string
  assignedToName?: string
  assignedBy?: string
  assignedByName?: string
  /** @deprecated use assignedBy */
  createdBy?: string
  patientId?: string | null
  patientName?: string | null
  title: string
  description?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: string | null
  createdAt: string
}

export type PersonnelPermissionDTO = {
  id?: string
  subrole: string
  permission: string
  granted: boolean
}
