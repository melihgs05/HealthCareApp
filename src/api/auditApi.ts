/**
 * HIPAA Audit Logging
 * ───────────────────
 * Every access to Protected Health Information (PHI) must be recorded
 * to satisfy HIPAA Security Rule § 164.312(b) — Audit Controls.
 *
 * In demo mode, entries are stored in a capped in-memory ring buffer
 * (max 500 entries) and surfaced to the Admin Audit Log page.
 * When Supabase is configured, entries are additionally persisted to an
 * `audit_logs` table (schema at bottom of this file).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'phi_view_chart'
  | 'phi_view_medications'
  | 'phi_view_test_results'
  | 'phi_view_notes'
  | 'phi_view_appointments'
  | 'phi_add_note'
  | 'phi_add_medication'
  | 'phi_update_medication'
  | 'phi_order_lab'
  | 'phi_prescribe'
  | 'phi_update_appointment'
  | 'phi_update_result_status'
  | 'phi_view_messages'
  | 'phi_send_message'
  | 'auth_login'
  | 'auth_logout'
  | 'auth_session_timeout'
  | 'admin_view_users'
  | 'admin_change_role'

export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: string
  action: AuditAction
  /** 'patient' | 'message' | 'system' */
  resourceType: 'patient' | 'message' | 'system'
  resourceId?: string
  patientId?: string
  patientName?: string
  /** Derived from navigator.userAgent */
  device?: string
}

// ─── In-memory ring buffer (demo / offline fallback) ────────────────────────

const MAX_LOG = 500
const memoryLog: AuditLogEntry[] = []

function push(entry: AuditLogEntry) {
  memoryLog.unshift(entry)
  if (memoryLog.length > MAX_LOG) memoryLog.length = MAX_LOG
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a PHI access event.  Fire-and-forget — never throws so it
 * cannot disrupt the calling UI code path.
 */
export function logPHIAccess(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'device'>,
): void {
  const full: AuditLogEntry = {
    ...entry,
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    device: navigator.userAgent.slice(0, 120),
  }

  push(full)

  if (isSupabaseConfigured) {
    void supabase.from('audit_logs').insert({
      user_id: full.userId,
      user_name: full.userName,
      user_role: full.userRole,
      action: full.action,
      resource_type: full.resourceType,
      resource_id: full.resourceId ?? null,
      patient_id: full.patientId ?? null,
      patient_name: full.patientName ?? null,
      device: full.device ?? null,
    })
  }
}

/**
 * Retrieve the audit log.
 * In demo mode returns the in-memory log.
 * With Supabase returns the latest 200 rows.
 */
export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured) return [...memoryLog]

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return [...memoryLog]

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    timestamp: row.created_at as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    userRole: row.user_role as string,
    action: row.action as AuditAction,
    resourceType: row.resource_type as AuditLogEntry['resourceType'],
    resourceId: row.resource_id as string | undefined,
    patientId: row.patient_id as string | undefined,
    patientName: row.patient_name as string | undefined,
    device: row.device as string | undefined,
  }))
}

/*
 * Supabase migration (run once):
 * ─────────────────────────────
 * create table audit_logs (
 *   id          uuid primary key default gen_random_uuid(),
 *   created_at  timestamptz not null default now(),
 *   user_id     text,
 *   user_name   text,
 *   user_role   text,
 *   action      text not null,
 *   resource_type text,
 *   resource_id text,
 *   patient_id  text,
 *   patient_name text,
 *   device      text
 * );
 * -- Only admins may read audit_logs
 * alter table audit_logs enable row level security;
 * create policy "admin read" on audit_logs
 *   for select using (auth.jwt() ->> 'role' = 'admin');
 * create policy "service insert" on audit_logs
 *   for insert with check (true);
 */
