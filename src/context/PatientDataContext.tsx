/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

// ─────────────────────────────────────────────────────────────
// Toggle this to `false` to use the real API layer instead of
// the mock data below. When false, PatientDataProvider would
// need to call the service functions from src/api/patientApi.ts
// and populate state from the API responses.
// ─────────────────────────────────────────────────────────────
const USE_MOCK_DATA = true

type Appointment = {
  id: string
  date: string
  time: string
  provider: string
  type: string
  location: string
  status: 'Upcoming' | 'Completed' | 'Cancelled'
}

type Medication = {
  id: string
  name: string
  dosage: string
  schedule: string
  active: boolean
}

type Result = {
  id: string
  date: string
  type: string
  summary: string
  status: 'Normal' | 'Follow up' | 'In progress'
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
  from: string
  subject: string
  preview: string
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
  addMessage: (input: {
    from: string
    subject: string
    body: string
  }) => void
  requestAppointment: (reason: string) => void
}

const PatientDataContext = createContext<PatientDataContextValue | undefined>(
  undefined,
)

const initialData = {
  profile: {
    id: 'patient-001',
    name: 'Alex Johnson',
    dob: '1985-04-12',
    mrn: 'A102938',
    primaryCareProvider: 'Dr. Emily Carter',
    insurance: 'BlueCross Preferred PPO',
  } as PatientProfile,
  nextAppointment: {
    id: 'appt-001',
    date: '2026-03-15',
    time: '10:30 AM',
    provider: 'Dr. Emily Carter',
    type: 'Annual physical',
    location: 'Main Clinic · Floor 3 · Suite 310',
    status: 'Upcoming' as const,
  } as Appointment,
  appointments: [
    {
      id: 'appt-001',
      date: '2026-03-15',
      time: '10:30 AM',
      provider: 'Dr. Emily Carter',
      type: 'Annual physical',
      location: 'Main Clinic · Floor 3 · Suite 310',
      status: 'Upcoming',
    },
    {
      id: 'appt-002',
      date: '2026-02-01',
      time: '2:00 PM',
      provider: 'Dr. Michael Lee',
      type: 'Follow-up',
      location: 'Main Clinic · Floor 2 · Suite 205',
      status: 'Completed',
    },
  ] as Appointment[],
  medications: [
    {
      id: 'med-001',
      name: 'Lisinopril',
      dosage: '10 mg',
      schedule: 'Once daily in the morning',
      active: true,
    },
    {
      id: 'med-002',
      name: 'Vitamin D3',
      dosage: '2000 IU',
      schedule: 'Once daily with food',
      active: true,
    },
  ] as Medication[],
  recentResults: [
    {
      id: 'res-001',
      date: '2026-02-02',
      type: 'Blood work',
      summary: 'All values within expected range.',
      status: 'Normal' as const,
    },
    {
      id: 'res-002',
      date: '2026-01-15',
      type: 'Blood pressure check',
      summary: 'Slightly elevated, lifestyle changes recommended.',
      status: 'Follow up' as const,
    },
  ] as Result[],
  activity: [
    {
      id: 'act-001',
      date: '2026-03-08',
      time: '09:14 AM',
      type: 'Login',
      description: 'Logged in from Chrome on Windows.',
    },
    {
      id: 'act-002',
      date: '2026-03-03',
      time: '04:22 PM',
      type: 'Message',
      description:
        'Sent a message to Dr. Carter about blood pressure readings.',
    },
    {
      id: 'act-003',
      date: '2026-02-02',
      time: '01:08 PM',
      type: 'Document',
      description: 'Viewed lab results: Comprehensive metabolic panel.',
    },
  ] as ActivityItem[],
  messages: [
    {
      id: 'msg-001',
      from: 'Dr. Emily Carter',
      subject: 'Your recent lab results',
      preview: 'Hi Alex, I reviewed your recent lab work and everything...',
      date: '2026-02-03',
      read: false,
    },
    {
      id: 'msg-002',
      from: 'Nursing Team',
      subject: 'Blood pressure follow-up',
      preview:
        'Thanks for sending your readings. Overall they look improved...',
      date: '2026-02-05',
      read: true,
    },
  ] as Message[],
}

export function PatientDataProvider({ children }: { children: ReactNode }) {
  const [profile] = useState(initialData.profile)
  const [nextAppointment, setNextAppointment] = useState<
    Appointment | null
  >(initialData.nextAppointment)
  const [appointments, setAppointments] = useState<Appointment[]>(
    initialData.appointments,
  )
  const [medications] = useState(initialData.medications)
  const [recentResults] = useState(initialData.recentResults)
  const [activity, setActivity] = useState<ActivityItem[]>(
    initialData.activity,
  )
  const [messages, setMessages] = useState<Message[]>(initialData.messages)

  const addMessage: PatientDataContextValue['addMessage'] = ({
    from,
    subject,
    body,
  }) => {
    const now = new Date()
    const date = now.toISOString().slice(0, 10)
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      from,
      subject,
      preview: body,
      date,
      read: false,
    }
    setMessages((prev) => [newMessage, ...prev])
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        date,
        time: now.toTimeString().slice(0, 5),
        type: 'Message',
        description: 'Sent a new secure message from the portal.',
      },
      ...prev,
    ])
  }

  const requestAppointment: PatientDataContextValue['requestAppointment'] = (
    reason: string,
  ) => {
    const now = new Date()
    const date = now.toISOString().slice(0, 10)
    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      date,
      time: '09:00 AM',
      provider: profile.primaryCareProvider,
      type: reason || 'Visit request',
      location: 'To be scheduled',
      status: 'Upcoming',
    }
    setAppointments((prev) => [newAppt, ...prev])
    setNextAppointment((current) => current ?? newAppt)
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        date,
        time: now.toTimeString().slice(0, 5),
        type: 'Appointment',
        description: 'Requested a new appointment from the portal.',
      },
      ...prev,
    ])
  }

  // In mock mode these are always false/null.
  // When USE_MOCK_DATA is false, set isLoading=true before API calls
  // and populate error if any call rejects.
  const isLoading = USE_MOCK_DATA ? false : false
  const error: string | null = USE_MOCK_DATA ? null : null

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
  if (!ctx) {
    throw new Error(
      'usePatientData must be used within a PatientDataProvider',
    )
  }
  return ctx
}

