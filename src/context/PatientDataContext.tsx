/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  fetchPatientProfile,
  fetchAppointments,
  fetchMedications,
  fetchTestResults,
  fetchActivityLog,
  fetchMessages,
  sendMessage as apiSendMessage,
  bookAppointment,
  logActivity,
} from '../api/patientApi'
import { useAuth } from './AuthContext'

// ─────────────────────────────────────────────────────────────
// Types (kept local so the context is self-contained)
// ─────────────────────────────────────────────────────────────
type Appointment = {
  id: string
  date: string
  time: string
  provider: string
  providerId: string
  type: string
  location: string
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'No-show'
  notes?: string | null
}

type Medication = {
  id: string
  name: string
  dosage: string
  schedule: string
  active: boolean
  prescribedBy?: string | null
}

type Result = {
  id: string
  date: string
  type: string
  summary: string
  status: 'Normal' | 'Follow up' | 'In progress'
  fileUrl?: string | null
}

type ActivityItem = {
  id: string
  date: string
  time: string
  type: 'Login' | 'Message' | 'Appointment' | 'Document'
  description: string
}

type Message = {
  id: string
  fromId: string
  from: string
  toId: string
  subject: string
  preview: string
  body?: string
  date: string
  read: boolean
}

type PatientProfile = {
  id: string
  name: string
  dob: string
  mrn: string
  primaryCareProvider: string
  insurance: string
}

type PatientDataContextValue = {
  isLoading: boolean
  error: string | null
  profile: PatientProfile
  nextAppointment: Appointment | null
  appointments: Appointment[]
  medications: Medication[]
  recentResults: Result[]
  activity: ActivityItem[]
  messages: Message[]
  refresh: () => Promise<void>
  addMessage: (input: { toId: string; from: string; subject: string; body: string }) => Promise<void>
  requestAppointment: (payload: {
    doctorId: string
    date: string
    time: string
    type: string
    location?: string
  }) => Promise<void>
}

const PatientDataContext = createContext<PatientDataContextValue | undefined>(undefined)

// ─────────────────────────────────────────────────────────────
// Demo data (used when Supabase is not configured)
// ─────────────────────────────────────────────────────────────
const demoProfile: PatientProfile = {
  id: 'demo-patient-001',
  name: 'Alex Johnson',
  dob: '1985-04-12',
  mrn: 'MRN-000001',
  primaryCareProvider: 'Dr. Emily Carter',
  insurance: 'BlueCross Preferred PPO',
}

const demoData = {
  appointments: [
    {
      id: 'appt-001', date: '2026-03-15', time: '10:30',
      provider: 'Dr. Emily Carter', providerId: 'demo-doctor-001',
      type: 'Annual physical', location: 'Main Clinic · Floor 3 · Suite 310',
      status: 'Upcoming' as const,
    },
    {
      id: 'appt-002', date: '2026-02-01', time: '14:00',
      provider: 'Dr. Michael Lee', providerId: 'demo-doctor-002',
      type: 'Follow-up', location: 'Main Clinic · Floor 2 · Suite 205',
      status: 'Completed' as const,
    },
  ] as Appointment[],
  medications: [
    { id: 'med-001', name: 'Lisinopril', dosage: '10 mg', schedule: 'Once daily in the morning', active: true },
    { id: 'med-002', name: 'Vitamin D3', dosage: '2000 IU', schedule: 'Once daily with food', active: true },
  ] as Medication[],
  recentResults: [
    { id: 'res-001', date: '2026-02-02', type: 'Blood work', summary: 'All values within expected range.', status: 'Normal' as const },
    { id: 'res-002', date: '2026-01-15', type: 'Blood pressure check', summary: 'Slightly elevated, lifestyle changes recommended.', status: 'Follow up' as const },
  ] as Result[],
  activity: [
    { id: 'act-001', date: '2026-03-08', time: '09:14', type: 'Login' as const, description: 'Logged in from Chrome on Windows.' },
    { id: 'act-002', date: '2026-03-03', time: '16:22', type: 'Message' as const, description: 'Sent a message to Dr. Carter about blood pressure readings.' },
    { id: 'act-003', date: '2026-02-02', time: '13:08', type: 'Document' as const, description: 'Viewed lab results: Comprehensive metabolic panel.' },
  ] as ActivityItem[],
  messages: [
    { id: 'msg-001', fromId: 'demo-doctor-001', from: 'Dr. Emily Carter', toId: 'demo-patient-001', subject: 'Your recent lab results', preview: 'Hi Alex, I reviewed your recent lab work and everything...', date: '2026-02-03', read: false },
    { id: 'msg-002', fromId: 'demo-nurse-001', from: 'Nursing Team', toId: 'demo-patient-001', subject: 'Blood pressure follow-up', preview: 'Thanks for sending your readings. Overall they look improved...', date: '2026-02-05', read: true },
  ] as Message[],
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function PatientDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<PatientProfile>(demoProfile)
  const [appointments, setAppointments] = useState<Appointment[]>(demoData.appointments)
  const [medications, setMedications] = useState<Medication[]>(demoData.medications)
  const [recentResults, setRecentResults] = useState<Result[]>(demoData.recentResults)
  const [activity, setActivity] = useState<ActivityItem[]>(demoData.activity)
  const [messages, setMessages] = useState<Message[]>(demoData.messages)

  const loadData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [prof, appts, meds, results, acts, msgs] = await Promise.all([
        fetchPatientProfile(user.id),
        fetchAppointments(user.id),
        fetchMedications(user.id),
        fetchTestResults(user.id),
        fetchActivityLog(user.id),
        fetchMessages(user.id),
      ])
      setProfile(prof)
      setAppointments(appts as Appointment[])
      setMedications(meds as Medication[])
      setRecentResults(results as Result[])
      setActivity(acts as ActivityItem[])
      setMessages(msgs as Message[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const addMessage = useCallback(
    async ({ toId, from, subject, body }: { toId: string; from: string; subject: string; body: string }) => {
      if (!isSupabaseConfigured) {
        const now = new Date()
        const date = now.toISOString().slice(0, 10)
        setMessages((prev) => [
          { id: `msg-${Date.now()}`, fromId: user?.id ?? 'demo', from, toId, subject, preview: body, date, read: false },
          ...prev,
        ])
        setActivity((prev) => [
          { id: `act-${Date.now()}`, date, time: now.toTimeString().slice(0, 5), type: 'Message', description: 'Sent a new secure message from the portal.' },
          ...prev,
        ])
        return
      }
      if (!user) return
      await apiSendMessage(user.id, toId, { subject, body })
      await logActivity(user.id, 'Message', `Sent message: ${subject}`)
      await loadData()
    },
    [user, loadData],
  )

  const requestAppointment = useCallback(
    async (payload: { doctorId: string; date: string; time: string; type: string; location?: string }) => {
      if (!isSupabaseConfigured) {
        const newAppt: Appointment = {
          id: `appt-${Date.now()}`,
          date: payload.date,
          time: payload.time,
          provider: 'Demo Doctor',
          providerId: payload.doctorId,
          type: payload.type,
          location: payload.location ?? 'To be scheduled',
          status: 'Upcoming',
        }
        setAppointments((prev) => [newAppt, ...prev])
        return
      }
      if (!user) return
      await bookAppointment({ patientId: user.id, ...payload })
      await logActivity(user.id, 'Appointment', `Booked appointment: ${payload.type}`)
      await loadData()
    },
    [user, loadData],
  )

  const nextAppointment = appointments
    .filter((a) => a.status === 'Upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null

  const value: PatientDataContextValue = {
    isLoading,
    error,
    profile,
    nextAppointment,
    appointments,
    medications,
    recentResults,
    activity,
    messages,
    refresh: loadData,
    addMessage,
    requestAppointment,
  }

  return (
    <PatientDataContext.Provider value={value}>
      {children}
    </PatientDataContext.Provider>
  )
}

export function usePatientData() {
  const ctx = useContext(PatientDataContext)
  if (!ctx) throw new Error('usePatientData must be used within a PatientDataProvider')
  return ctx
}

