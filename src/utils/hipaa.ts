/**
 * HIPAA-aligned utility helpers
 *
 * Route parameter obfuscation
 * ────────────────────────────
 * Raw patient IDs (e.g. "demo-patient-001") must never appear in browser
 * URLs, history, or server access logs — this constitutes a PHI leak.
 * We use URL-safe Base-64 encoding so that the route segment is opaque
 * to an observer.  NOTE: this is obfuscation, not encryption.  For a
 * production deployment, derive the token server-side using AES-GCM or
 * equiv. with a rotating key and a short TTL.
 */

/**
 * Encode a plain patient / resource ID into a URL-safe Base-64 token.
 * e.g. "demo-patient-001"  →  "ZGVtby1wYXRpZW50LTAwMQ"
 */
export function encodePhiId(rawId: string): string {
  return btoa(rawId).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * Decode a URL-safe Base-64 token back to the raw ID.
 * Falls back to returning the input unchanged so that legacy (plain) IDs
 * still resolve during a transition period.
 */
export function decodePhiId(token: string): string {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    return atob(pad > 0 ? b64 + '='.repeat(4 - pad) : b64)
  } catch {
    return token // graceful fallback for plain IDs
  }
}

/**
 * Build the doctor's patient-chart path with an obfuscated ID.
 */
export function patientChartPath(rawPatientId: string): string {
  return `/doctor/patients/${encodePhiId(rawPatientId)}/chart`
}

// ─── Session inactivity constants ──────────────────────────────────────────
/** HIPAA recommendation: auto-logout after 15 minutes of inactivity */
export const HIPAA_IDLE_TIMEOUT_MS = 15 * 60 * 1000

/** Warning shown 2 minutes before auto-logout */
export const HIPAA_IDLE_WARN_MS = 13 * 60 * 1000
