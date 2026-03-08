/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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

const initialNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'info',
    title: 'Appointment reminder',
    message: 'You have an appointment with Dr. Emily Carter on March 15 at 10:30 AM.',
    read: false,
    timestamp: '2026-03-08T09:00:00Z',
  },
  {
    id: 'notif-002',
    type: 'success',
    title: 'Lab results available',
    message: 'Your recent blood work results are now available. All values within range.',
    read: false,
    timestamp: '2026-03-07T14:22:00Z',
  },
  {
    id: 'notif-003',
    type: 'info',
    title: 'New message from care team',
    message: 'Dr. Carter sent you a follow-up about your recent visit.',
    read: true,
    timestamp: '2026-03-06T11:45:00Z',
  },
]

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

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
