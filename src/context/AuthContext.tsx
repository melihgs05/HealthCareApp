/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type AuthUser = {
  id: string
  name: string
  email: string
  role: 'patient' | 'doctor' | 'admin'
}

type AuthContextValue = {
  isAuthenticated: boolean
  user: AuthUser | null
  login: (options: {
    email: string
    password: string
    role: AuthUser['role']
  }) => Promise<void>
  signup: (options: {
    name: string
    email: string
    password: string
    role: AuthUser['role']
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'patient_portal_demo_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored) as AuthUser
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
  })

  const persistUser = useCallback((value: AuthUser | null) => {
    setUser(value)
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const login = useCallback(
    async ({ email, role }: { email: string; password: string; role: AuthUser['role'] }) => {
      const demoUser: AuthUser = {
        id: `${role}-001`,
        name: 'Alex Johnson',
        email,
        role,
      }
      persistUser(demoUser)
    },
    [persistUser],
  )

  const signup = useCallback(
    async ({
      name,
      email,
      role,
    }: {
      name: string
      email: string
      password: string
      role: AuthUser['role']
    }) => {
      const newUser: AuthUser = {
        id: `${role}-001`,
        name,
        email,
        role,
      }
      persistUser(newUser)
    },
    [persistUser],
  )

  const logout = useCallback(() => {
    persistUser(null)
  }, [persistUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      user,
      login,
      signup,
      logout,
    }),
    [user, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

