/**
 * HIPAA Session Context
 * ─────────────────────
 * Implements two HIPAA Security Rule requirements:
 *
 *  § 164.312(a)(2)(iii) — Automatic Logoff
 *    After HIPAA_IDLE_TIMEOUT_MS (15 min) of user inactivity, the session
 *    is terminated and the user is redirected to /login.
 *
 *  § 164.308(a)(1) — Security Management / Risk Management
 *    A visible HIPAA compliance notice is shown to users when they first
 *    access a PHI-containing section each session.
 */

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { logPHIAccess } from '../api/auditApi'
import { HIPAA_IDLE_TIMEOUT_MS, HIPAA_IDLE_WARN_MS } from '../utils/hipaa'

// ─── Context shape ──────────────────────────────────────────────────────────
interface HIPAAContextValue {
  /** Whether the PHI access acknowledgement notice has been accepted */
  noticeAccepted: boolean
  acceptNotice: () => void
  /** Remaining seconds until auto-logout (only meaningful when < WARN threshold) */
  idleSecondsLeft: number | null
  /** Reset the idle timer (called on user activity) */
  resetIdle: () => void
}

const HIPAAContext = createContext<HIPAAContextValue | null>(null)

export function useHIPAA() {
  const ctx = useContext(HIPAAContext)
  if (!ctx) throw new Error('useHIPAA must be used inside HIPAAProvider')
  return ctx
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function HIPAAProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // HIPAA Notice acknowledgement —————————————————————————————
  // Persisted per-session in sessionStorage so every login requires a fresh ack
  const [noticeAccepted, setNoticeAccepted] = useState<boolean>(() => {
    return sessionStorage.getItem('hipaa_notice_accepted') === 'true'
  })

  const acceptNotice = useCallback(() => {
    sessionStorage.setItem('hipaa_notice_accepted', 'true')
    setNoticeAccepted(true)
  }, [])

  // Clear acceptance when user logs out (new session)
  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem('hipaa_notice_accepted')
      setNoticeAccepted(false)
    }
  }, [isAuthenticated])

  // Idle session timeout —————————————————————————————————————
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [idleSecondsLeft, setIdleSecondsLeft] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warnRef.current) clearTimeout(warnRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setIdleSecondsLeft(null)
  }, [])

  const resetIdle = useCallback(() => {
    if (!isAuthenticated) return
    clearTimers()

    // Warn the user 2 minutes before logout
    warnRef.current = setTimeout(() => {
      const remaining = Math.round((HIPAA_IDLE_TIMEOUT_MS - HIPAA_IDLE_WARN_MS) / 1000)
      setIdleSecondsLeft(remaining)
      countdownRef.current = setInterval(() => {
        setIdleSecondsLeft((s) => (s !== null && s > 1 ? s - 1 : null))
      }, 1000)
    }, HIPAA_IDLE_WARN_MS)

    // Auto-logout
    timeoutRef.current = setTimeout(async () => {
      clearTimers()
      if (user) {
        logPHIAccess({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'auth_session_timeout',
          resourceType: 'system',
        })
      }
      await logout()
      navigate('/login', { replace: true })
    }, HIPAA_IDLE_TIMEOUT_MS)
  }, [isAuthenticated, clearTimers, logout, navigate, user])

  // Attach activity event listeners
  useEffect(() => {
    if (!isAuthenticated) { clearTimers(); return }

    const EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    const handleActivity = () => resetIdle()

    EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }))
    resetIdle() // start timer on mount / login

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, handleActivity))
      clearTimers()
    }
  }, [isAuthenticated, clearTimers, resetIdle])

  return (
    <HIPAAContext.Provider value={{ noticeAccepted, acceptNotice, idleSecondsLeft, resetIdle }}>
      {children}
    </HIPAAContext.Provider>
  )
}
