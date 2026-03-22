/**
 * Custom authentication helpers for the Neon PostgreSQL backend.
 *
 * Since Neon is raw PostgreSQL (no Supabase Auth service), we handle auth
 * ourselves:
 *  - Passwords are hashed with PBKDF2 / SHA-256 via the Web Crypto API.
 *  - Sessions are stored as a signed JSON blob in localStorage.
 *
 * ⚠️  For a production HIPAA environment, move auth to a secure server-side
 * API that issues short-lived JWTs and never stores credentials in the
 * browser.
 */

import { getNeonSql } from './neonClient'
import type { UserRole, PersonnelSubrole } from '../api/types'

// ─── Password hashing via Web Crypto (PBKDF2/SHA-256) ────────────────────

const PBKDF2_ITER = 100_000
const KEY_LEN = 256

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as Uint8Array<ArrayBuffer>, iterations: PBKDF2_ITER },
    baseKey,
    KEY_LEN,
  )
}

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return arr
}

/** Hash a plaintext password. Returns `salt:hash` string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hashBuf = await deriveKey(password, salt)
  return `${bufToHex(salt)}:${bufToHex(hashBuf)}`
}

/** Verifies a plaintext password against a stored `salt:hash` string. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = hexToBuf(saltHex)
  const derived = await deriveKey(password, salt)
  return bufToHex(derived) === hashHex
}

// ─── Session (localStorage) ───────────────────────────────────────────────

const SESSION_KEY = 'carebridge_neon_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

export type NeonSession = {
  id: string
  name: string
  email: string
  role: UserRole
  subrole?: PersonnelSubrole | null
  avatarUrl?: string | null
  phone?: string | null
  expiresAt: number
}

export function saveSession(session: Omit<NeonSession, 'expiresAt'>): NeonSession {
  const full: NeonSession = { ...session, expiresAt: Date.now() + SESSION_TTL_MS }
  localStorage.setItem(SESSION_KEY, JSON.stringify(full))
  return full
}

export function loadSession(): NeonSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as NeonSession
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

// ─── Auth operations ──────────────────────────────────────────────────────

export async function neonSignIn(
  email: string,
  password: string,
): Promise<NeonSession> {
  const sql = getNeonSql()
  const rows = await sql`
    SELECT id, name, email, role, subrole, avatar_url, phone, password_hash
    FROM profiles
    WHERE email = ${email}
    LIMIT 1
  `
  const signInRows = rows as Record<string, unknown>[]
  if (!signInRows.length) throw new Error('Invalid email or password')

  const row = signInRows[0]
  const hash = row.password_hash as string | null

  if (!hash) throw new Error('Account has no password set. Please contact support.')

  const valid = await verifyPassword(password, hash)
  if (!valid) throw new Error('Invalid email or password')

  return saveSession({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    subrole: (row.subrole as PersonnelSubrole | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
  })
}

export async function neonSignUp(options: {
  name: string
  email: string
  password: string
  role: UserRole
  subrole?: PersonnelSubrole
}): Promise<NeonSession> {
  const sql = getNeonSql()

  // Check for existing email
  const existing = await sql`SELECT id FROM profiles WHERE email = ${options.email} LIMIT 1`
  if ((existing as Record<string, unknown>[]).length) throw new Error('An account with this email already exists')

  const passwordHash = await hashPassword(options.password)

  const insertRows = await sql`
    INSERT INTO profiles (name, email, role, subrole, password_hash)
    VALUES (
      ${options.name},
      ${options.email},
      ${options.role},
      ${options.subrole ?? null},
      ${passwordHash}
    )
    RETURNING id, name, email, role, subrole, avatar_url, phone
  `
  const row = (insertRows as Record<string, unknown>[])[0]

  // Create a patients row for patient signups
  if (options.role === 'patient') {
    const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`
    await sql`
      INSERT INTO patients (id, mrn, dob)
      VALUES (${row.id as string}, ${mrn}, ${'1990-01-01'})
      ON CONFLICT (id) DO NOTHING
    `
  }

  return saveSession({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    subrole: (row.subrole as PersonnelSubrole | null) ?? null,
    avatarUrl: null,
    phone: null,
  })
}

// ─── Email verification ───────────────────────────────────────────────────

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Creates an email-verification token for a user.
 * Returns the plain token to include in the verification email link.
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  const sql = getNeonSql()
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString()
  await sql`
    INSERT INTO email_verification_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `
  return token
}

/**
 * Verifies an email-verification token.
 * Returns the user's id + email on success, throws on failure.
 */
export async function verifyEmailToken(token: string): Promise<{ userId: string; email: string }> {
  const sql = getNeonSql()
  const rows = await sql`
    SELECT evt.user_id, p.email
    FROM email_verification_tokens evt
    JOIN profiles p ON p.id = evt.user_id
    WHERE evt.token = ${token}
      AND evt.expires_at > now()
      AND evt.used_at IS NULL
    LIMIT 1
  `
  if (!(rows as unknown[]).length) throw new Error('Verification link is invalid or has expired.')
  const row = (rows as Record<string, unknown>[])[0]
  await sql`
    UPDATE email_verification_tokens SET used_at = now() WHERE token = ${token}
  `
  await sql`
    UPDATE profiles SET email_verified = true WHERE id = ${row.user_id as string}
  `
  return { userId: row.user_id as string, email: row.email as string }
}

// ─── Password reset ───────────────────────────────────────────────────────

const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Generates a password-reset token for the given email address.
 * If no account exists, returns null (caller should NOT reveal this to user).
 */
export async function requestPasswordReset(email: string): Promise<{ token: string; name: string } | null> {
  const sql = getNeonSql()
  const rows = await sql`SELECT id, name FROM profiles WHERE email = ${email.toLowerCase()} LIMIT 1`
  if (!(rows as unknown[]).length) return null
  const row = (rows as Record<string, unknown>[])[0]
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString()
  await sql`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (${row.id as string}, ${token}, ${expiresAt})
  `
  return { token, name: row.name as string }
}

/**
 * Resets the password using a valid reset token.
 * Invalidates the token after use.
 */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const sql = getNeonSql()
  const rows = await sql`
    SELECT user_id FROM password_reset_tokens
    WHERE token = ${token}
      AND expires_at > now()
      AND used_at IS NULL
    LIMIT 1
  `
  if (!(rows as unknown[]).length) throw new Error('Reset link is invalid or has expired.')
  const userId = (rows as Record<string, unknown>[])[0].user_id as string
  const newHash = await hashPassword(newPassword)
  await sql`UPDATE profiles SET password_hash = ${newHash} WHERE id = ${userId}`
  await sql`UPDATE password_reset_tokens SET used_at = now() WHERE token = ${token}`
}

/**
 * Finds or creates a user from a Google OAuth id_token payload.
 * If an account with the same email already exists, it links the Google ID.
 * New accounts are created with the 'patient' role.
 */
export async function neonSignInWithGoogle(profile: {
  googleId: string
  email: string
  name: string
  avatarUrl?: string | null
}): Promise<NeonSession> {
  const sql = getNeonSql()

  const existing = await sql`
    SELECT id, name, email, role, subrole, avatar_url, phone
    FROM profiles
    WHERE google_id = ${profile.googleId} OR email = ${profile.email}
    LIMIT 1
  `
  const rows = existing as Record<string, unknown>[]

  if (rows.length) {
    const row = rows[0]
    // Link google_id if account was previously email-only
    await sql`
      UPDATE profiles
      SET google_id = ${profile.googleId}
      WHERE id = ${row.id as string} AND google_id IS NULL
    `
    return saveSession({
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as UserRole,
      subrole: (row.subrole as PersonnelSubrole | null) ?? null,
      avatarUrl: (row.avatar_url as string | null) ?? profile.avatarUrl ?? null,
      phone: (row.phone as string | null) ?? null,
    })
  }

  // New user — register as patient
  const insertRows = await sql`
    INSERT INTO profiles (name, email, role, google_id, avatar_url)
    VALUES (${profile.name}, ${profile.email}, 'patient', ${profile.googleId}, ${profile.avatarUrl ?? null})
    RETURNING id, name, email, role, subrole, avatar_url, phone
  `
  const row = (insertRows as Record<string, unknown>[])[0]

  const mrn = `MRN-${Date.now().toString(36).toUpperCase()}`
  await sql`
    INSERT INTO patients (id, mrn, dob)
    VALUES (${row.id as string}, ${mrn}, ${'1990-01-01'})
    ON CONFLICT (id) DO NOTHING
  `

  return saveSession({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    subrole: null,
    avatarUrl: (row.avatar_url as string | null) ?? profile.avatarUrl ?? null,
    phone: null,
  })
}

export async function neonUpdateProfile(
  userId: string,
  updates: { name?: string; phone?: string | null; avatarUrl?: string | null },
): Promise<void> {
  const sql = getNeonSql()
  await sql`
    UPDATE profiles SET
      name       = COALESCE(${updates.name ?? null}, name),
      phone      = COALESCE(${updates.phone ?? null}, phone),
      avatar_url = COALESCE(${updates.avatarUrl ?? null}, avatar_url)
    WHERE id = ${userId}
  `
}
