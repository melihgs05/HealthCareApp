/**
 * Neon PostgreSQL Client (HTTP mode)
 * ───────────────────────────────────
 * Uses @neondatabase/serverless which routes queries through Neon's
 * HTTPS endpoint — compatible with browser environments.
 *
 * ⚠️  DEVELOPMENT NOTE: VITE_NEON_DATABASE_URL is bundled in the
 * frontend. For production healthcare deployments, move all DB access
 * behind a server-side API (Express / Edge Functions / Vercel API routes)
 * and never expose the connection string to the browser.
 *
 * Configure in .env:
 *   VITE_NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
 */

import { neon } from '@neondatabase/serverless'

const _url = import.meta.env.VITE_NEON_DATABASE_URL as string | undefined

/** True when a Neon connection string has been provided. */
export const isNeonConfigured: boolean = Boolean(
  _url && _url.startsWith('postgresql://'),
)

let _sql: ReturnType<typeof neon> | null = null

/**
 * Returns the cached Neon SQL tag function.
 * Throws a clear error if VITE_NEON_DATABASE_URL is not set.
 */
export function getNeonSql(): ReturnType<typeof neon> {
  if (!isNeonConfigured || !_url) {
    throw new Error(
      '[Neon] VITE_NEON_DATABASE_URL is not configured. ' +
        'Add it to your .env file to enable the Neon PostgreSQL backend.',
    )
  }
  if (!_sql) {
    _sql = neon(_url)
  }
  return _sql
}
