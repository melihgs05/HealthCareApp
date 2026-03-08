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
  login: (options: {
    email: string
    password: string
    role: UserRole
  }) => Promise<void>
  signup: (options: {
    name: string
    email: string
    password: string
    role: UserRole
    subrole?: PersonnelSubrole
  }) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<AuthUser, 'name' | 'phone' | 'avatarUrl'>>) => Promise<void>
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
    async ({ email, password, role }: { email: string; password: string; role: UserRole }) => {
      if (!isSupabaseConfigured) {
        const demoUser: AuthUser = {
          id: `demo-${role}-001`,
          name: role === 'patient' ? 'Alex Johnson (Demo)' : role === 'doctor' ? 'Dr. Emily Carter (Demo)' : 'Admin User (Demo)',
          email,
          role,
        }
        setUser(demoUser)
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser))
        return
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      if (data.session) await hydrateUser(data.session)
    },
    [hydrateUser],
  )

  // ── Signup ──
  const signup = useCallback(
    async ({ name, email, password, role, subrole }: {
      name: string; email: string; password: string; role: UserRole; subrole?: PersonnelSubrole
    }) => {
      if (!isSupabaseConfigured) {
        const demoUser: AuthUser = { id: `demo-${role}-001`, name, email, role, subrole }
        setUser(demoUser)
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser))
        return
      }
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

  // ── Logout ──
  const logout = useCallback(async () => {
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
    () => ({ isAuthenticated: Boolean(user), user, isLoading, login, signup, logout, updateProfile }),
    [user, isLoading, login, signup, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

