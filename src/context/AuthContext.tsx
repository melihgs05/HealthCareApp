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
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { isNeonConfigured } from '../lib/neonClient'
import {
  neonSignIn,
  neonSignUp,
  neonUpdateProfile,
  loadSession,
  clearSession,
  requestPasswordReset as neonRequestReset,
  confirmPasswordReset as neonConfirmReset,
  createEmailVerificationToken,
} from '../lib/neonAuth'
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/emailService'
import type { UserRole, PersonnelSubrole } from '../api/types'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  subrole?: PersonnelSubrole | null
  avatarUrl?: string | null
  phone?: string | null
}

type AuthContextValue = {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  /** Returns the authenticated user's role so callers can navigate. */
  login: (options: { email: string; password: string }) => Promise<UserRole>
  signup: (options: {
    name: string
    email: string
    password: string
    role: UserRole
    subrole?: PersonnelSubrole
  }) => Promise<void>
  /** Opens Google OAuth flow. Resolves after redirect. */
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<AuthUser, 'name' | 'phone' | 'avatarUrl'>>) => Promise<void>
  /** Sends a password-reset email if the address exists. Never throws for unknown emails. */
  requestPasswordReset: (email: string) => Promise<void>
  /** Completes the password reset using a valid token. */
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const DEMO_STORAGE_KEY = 'patient_portal_demo_user'

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Initialize: restore session ──
  useEffect(() => {
    // ── Neon mode ──
    if (isNeonConfigured) {
      const session = loadSession()
      if (session) {
        setUser({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          subrole: session.subrole ?? null,
          avatarUrl: session.avatarUrl ?? null,
          phone: session.phone ?? null,
        })
      }
      setIsLoading(false)
      return
    }

    // ── Demo mode (no backend configured) ──
    if (!isSupabaseConfigured) {
      const stored = window.localStorage.getItem(DEMO_STORAGE_KEY)
      if (stored) {
        try {
          setUser(JSON.parse(stored) as AuthUser)
        } catch {
          window.localStorage.removeItem(DEMO_STORAGE_KEY)
        }
      }
      setIsLoading(false)
      return
    }

    // ── Supabase mode ──
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await hydrateUser(session)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await hydrateUser(session)
        } else {
          setUser(null)
        }
      },
    )

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hydrateUser = useCallback(async (session: Session) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        subrole: profile.subrole as PersonnelSubrole | null,
        avatarUrl: profile.avatar_url,
        phone: profile.phone,
      })
    }
  }, [])

  // ── Login ──
  const login = useCallback(
    async ({ email, password }: { email: string; password: string }): Promise<UserRole> => {
      // Neon mode — role comes from DB
      if (isNeonConfigured) {
        const session = await neonSignIn(email, password)
        setUser({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          subrole: session.subrole ?? null,
          avatarUrl: session.avatarUrl ?? null,
          phone: session.phone ?? null,
        })
        return session.role
      }

      // Demo mode
      if (!isSupabaseConfigured) {
        // Detect role from a stored demo session or default to 'patient'
        const storedRaw = window.localStorage.getItem(DEMO_STORAGE_KEY)
        const storedRole: UserRole = storedRaw
          ? ((JSON.parse(storedRaw) as AuthUser).role ?? 'patient')
          : 'patient'
        const demoUser: AuthUser = {
          id: `demo-${storedRole}-001`,
          name: storedRole === 'patient' ? 'Alex Johnson (Demo)' : storedRole === 'doctor' ? 'Dr. Emily Carter (Demo)' : 'Admin User (Demo)',
          email,
          role: storedRole,
        }
        setUser(demoUser)
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser))
        return storedRole
      }

      // Supabase mode — role comes from profiles table
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      if (data.session) await hydrateUser(data.session)
      // hydrateUser sets user in state; return the resolved role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session!.user.id)
        .single()
      return (profileData?.role as UserRole) ?? 'patient'
    },
    [hydrateUser],
  )

  // ── Google OAuth ──
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    // Supabase mode: delegate to Supabase OAuth
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/oauth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw new Error(error.message)
      return
    }

    // Neon mode: use id_token implicit flow — no client secret needed for SPAs.
    // Google returns a signed JWT directly in the URL hash after the user consents.
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) throw new Error('Google OAuth is not configured. Set VITE_GOOGLE_CLIENT_ID in your .env file.')
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`)
    const scope = encodeURIComponent('openid email profile')
    const state = crypto.randomUUID()
    const nonce = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', state)
    sessionStorage.setItem('oauth_nonce', nonce)
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=id_token&scope=${scope}&state=${encodeURIComponent(state)}&nonce=${encodeURIComponent(nonce)}&prompt=select_account`
  }, [])

  // ── Signup ──
  const signup = useCallback(
    async ({ name, email, password, role, subrole }: {
      name: string; email: string; password: string; role: UserRole; subrole?: PersonnelSubrole
    }) => {
      // Neon mode
      if (isNeonConfigured) {
        const session = await neonSignUp({ name, email, password, role, subrole })
        setUser({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          subrole: session.subrole ?? null,
          avatarUrl: null,
          phone: null,
        })
        // Send email verification (non-blocking)
        void createEmailVerificationToken(session.id).then((token) =>
          sendVerificationEmail(email, name, token)
        )
        return
      }

      // Demo mode
      if (!isSupabaseConfigured) {
        const demoUser: AuthUser = { id: `demo-${role}-001`, name, email, role, subrole }
        setUser(demoUser)
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser))
        return
      }

      // Supabase mode
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role, subrole: subrole ?? null } },
      })
      if (error) throw new Error(error.message)
      if (data.session) await hydrateUser(data.session)
    },
    [hydrateUser],
  )

  // ── Password reset ──
  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    if (isNeonConfigured) {
      const result = await neonRequestReset(email)
      if (result) {
        await sendPasswordResetEmail(email, result.name, result.token)
      }
      // Always resolves without error (don't reveal if email exists)
      return
    }
    if (isSupabaseConfigured) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    }
    // Demo mode: no-op
  }, [])

  const confirmPasswordReset = useCallback(async (token: string, newPassword: string): Promise<void> => {
    if (isNeonConfigured) {
      await neonConfirmReset(token, newPassword)
      return
    }
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)
    }
  }, [])

  // ── Logout ──
  const logout = useCallback(async () => {
    if (isNeonConfigured) {
      clearSession()
      setUser(null)
      return
    }
    if (!isSupabaseConfigured) {
      setUser(null)
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // ── Update profile ──
  const updateProfile = useCallback(
    async (updates: Partial<Pick<AuthUser, 'name' | 'phone' | 'avatarUrl'>>) => {
      if (!user) return

      if (isNeonConfigured) {
        await neonUpdateProfile(user.id, updates)
        const updated = { ...user, ...updates }
        setUser(updated)
        return
      }

      if (!isSupabaseConfigured) {
        const updated = { ...user, ...updates }
        setUser(updated)
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated))
        return
      }

      const dbUpdate: Record<string, string | null> = {}
      if (updates.name !== undefined) dbUpdate.name = updates.name
      if (updates.phone !== undefined) dbUpdate.phone = updates.phone ?? null
      if (updates.avatarUrl !== undefined) dbUpdate.avatar_url = updates.avatarUrl ?? null
      const { error } = await supabase.from('profiles').update(dbUpdate).eq('id', user.id)
      if (error) throw new Error(error.message)
      setUser((prev) => (prev ? { ...prev, ...updates } : prev))
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: Boolean(user), user, isLoading, login, signup, signInWithGoogle, logout, updateProfile, requestPasswordReset, confirmPasswordReset }),
    [user, isLoading, login, signup, signInWithGoogle, logout, updateProfile, requestPasswordReset, confirmPasswordReset],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

