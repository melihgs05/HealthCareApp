/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import type { UserRole } from '../api/types'

export type NotificationType = 'info' | 'success' | 'warning' | 'alert'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  timestamp: string
}

type NotificationsContextValue = {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  addNotification: (input: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

function getInitialNotifications(role: UserRole | undefined): Notification[] {
  switch (role) {
    case 'doctor':
      return [
        { id: 'notif-d-001', type: 'alert', title: 'Results pending sign-off', message: 'Alex Johnson\'s CBC and metabolic panel results are awaiting your review.', read: false, timestamp: '2026-03-08T08:00:00Z' },
        { id: 'notif-d-002', type: 'info', title: 'New patient message', message: 'Maria Gomez sent you a message regarding her blood pressure follow-up.', read: false, timestamp: '2026-03-07T15:30:00Z' },
        { id: 'notif-d-003', type: 'success', title: 'Schedule confirmed', message: 'Your availability for March 15 has been updated successfully.', read: true, timestamp: '2026-03-06T12:00:00Z' },
      ]
    case 'personnel':
      return [
        { id: 'notif-p-001', type: 'alert', title: 'New lab order assigned', message: 'Dr. Carter ordered a CBC + metabolic panel for patient Alex Johnson. Priority: Routine.', read: false, timestamp: '2026-03-08T09:00:00Z' },
        { id: 'notif-p-002', type: 'warning', title: 'Task due today', message: 'Specimen collection for Room 3A patient is due before 10 AM.', read: false, timestamp: '2026-03-08T07:00:00Z' },
        { id: 'notif-p-003', type: 'info', title: 'Shift assignment', message: 'You are scheduled for the morning shift (07:00–15:00) on March 10.', read: true, timestamp: '2026-03-05T16:00:00Z' },
      ]
    case 'admin':
      return [
        { id: 'notif-a-001', type: 'info', title: 'New user registration', message: 'A new healthcare staff account is pending review: nurse_jane@example.com.', read: false, timestamp: '2026-03-08T10:00:00Z' },
        { id: 'notif-a-002', type: 'success', title: 'System healthy', message: 'All integrations (EHR, lab, pharmacy) are operating normally.', read: true, timestamp: '2026-03-07T00:00:00Z' },
        { id: 'notif-a-003', type: 'warning', title: 'Pending permission requests', message: '3 unresolved personnel permission requests require your attention.', read: false, timestamp: '2026-03-06T09:00:00Z' },
      ]
    default: // patient
      return [
        { id: 'notif-001', type: 'info', title: 'Appointment reminder', message: 'You have an appointment with Dr. Emily Carter on March 15 at 10:30 AM.', read: false, timestamp: '2026-03-08T09:00:00Z' },
        { id: 'notif-002', type: 'success', title: 'Lab results available', message: 'Your recent blood work results are now available. All values within range.', read: false, timestamp: '2026-03-07T14:22:00Z' },
        { id: 'notif-003', type: 'info', title: 'New message from care team', message: 'Dr. Carter sent you a follow-up about your recent visit.', read: true, timestamp: '2026-03-06T11:45:00Z' },
      ]
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>(() => getInitialNotifications(undefined))

  useEffect(() => {
    setNotifications(getInitialNotifications(user?.role))
  }, [user?.role])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const addNotification = useCallback(
    (input: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
      const newNotif: Notification = {
        ...input,
        id: `notif-${Date.now()}`,
        read: false,
        timestamp: new Date().toISOString(),
      }
      setNotifications((prev) => [newNotif, ...prev])
    },
    [],
  )

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, markRead, markAllRead, addNotification }),
    [notifications, unreadCount, markRead, markAllRead, addNotification],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return ctx
}
