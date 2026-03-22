/**
 * DatabaseModeContext
 * ───────────────────
 * Provides a runtime-toggleable `isDemoMode` flag that controls whether
 * the app shows live data from the real DB or the built-in demo dataset.
 *
 * Priority / resolution order:
 *  1. localStorage value (instant, client-controlled)
 *  2. `system_settings.demo_mode` value in the real DB (loaded on mount)
 *  3. Defaults to `true` when no DB backend is configured at all
 *
 * The admin panel can call `setDemoMode(false)` to switch to live data.
 * When a real DB is configured, the change is also persisted to the DB.
 */

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
import { isNeonConfigured, getNeonSql } from '../lib/neonClient'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const LS_KEY = 'carebridge_demo_mode'

function loadFromStorage(): boolean {
  const raw = localStorage.getItem(LS_KEY)
  if (raw === 'false') return false
  if (raw === 'true') return true
  // Default: demo mode when no real backend is configured
  return !isNeonConfigured && !isSupabaseConfigured
}

type DatabaseModeValue = {
  /** True when showing demo / simulated data */
  isDemoMode: boolean
  /** Whether the DB backend is configured (Neon or Supabase) */
  isDbConfigured: boolean
  /** Admin-callable — updates localStorage, then persists to DB */
  setDemoMode: (value: boolean) => Promise<void>
}

const DatabaseModeContext = createContext<DatabaseModeValue | undefined>(undefined)

export function DatabaseModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(loadFromStorage)

  const isDbConfigured = isNeonConfigured || isSupabaseConfigured

  // Sync with DB on mount (override localStorage if DB has a value)
  useEffect(() => {
    if (!isDbConfigured) return // can't reach DB, keep localStorage value

    async function syncFromDb() {
      try {
        let dbValue: string | null = null

        if (isNeonConfigured) {
          const sql = getNeonSql()
          const rows = await sql`
            SELECT value FROM system_settings WHERE key = 'demo_mode' LIMIT 1
          `
          dbValue = (rows as Record<string, unknown>[])[0]?.value as string ?? null
        } else if (isSupabaseConfigured) {
          const { data } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'demo_mode')
            .single()
          dbValue = data?.value ?? null
        }

        if (dbValue !== null) {
          const dbDemoMode = dbValue === 'true'
          setIsDemoModeState(dbDemoMode)
          localStorage.setItem(LS_KEY, String(dbDemoMode))
        }
      } catch {
        // DB unreachable — keep localStorage value
      }
    }

    void syncFromDb()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDbConfigured])

  const setDemoMode = useCallback(async (value: boolean) => {
    // Update localStorage immediately
    setIsDemoModeState(value)
    localStorage.setItem(LS_KEY, String(value))

    // Persist to DB if connected
    if (!isDbConfigured) return
    try {
      if (isNeonConfigured) {
        const sql = getNeonSql()
        await sql`
          INSERT INTO system_settings (key, value)
          VALUES ('demo_mode', ${String(value)})
          ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = now()
        `
      } else if (isSupabaseConfigured) {
        await supabase
          .from('system_settings')
          .upsert({ key: 'demo_mode', value: String(value) }, { onConflict: 'key' })
      }
    } catch (err) {
      console.error('[DatabaseMode] Failed to persist demo_mode to DB:', err)
    }
  }, [isDbConfigured])

  const value = useMemo<DatabaseModeValue>(
    () => ({ isDemoMode, isDbConfigured, setDemoMode }),
    [isDemoMode, isDbConfigured, setDemoMode],
  )

  return (
    <DatabaseModeContext.Provider value={value}>
      {children}
    </DatabaseModeContext.Provider>
  )
}

export function useDatabaseMode() {
  const ctx = useContext(DatabaseModeContext)
  if (!ctx) throw new Error('useDatabaseMode must be used within a DatabaseModeProvider')
  return ctx
}
