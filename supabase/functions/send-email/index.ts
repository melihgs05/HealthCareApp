// @ts-nocheck — Deno runtime: not compiled by the Vite/TS project
/**
 * Supabase Edge Function — send-email
 *
 * A secure server-side relay that forwards email payloads to Resend.
 * The RESEND_API_KEY is stored as a Supabase secret and never exposed
 * to browser code.
 *
 * Deploy:
 *   supabase functions deploy send-email --no-verify-jwt
 *
 * Set secrets:
 *   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
 *   supabase secrets set FROM_EMAIL="CareBridge <noreply@yourdomain.com>"
 *
 * Then set in your .env:
 *   VITE_EMAIL_API_URL=https://<project-ref>.supabase.co/functions/v1/send-email
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'CareBridge <noreply@carebridge.health>'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!RESEND_API_KEY) {
    console.error('[send-email] RESEND_API_KEY secret is not set')
    return new Response(JSON.stringify({ error: 'Email service is not configured on the server.' }), {
      status: 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: { to: string; subject: string; html: string; from?: string; preview?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!body.to || !body.subject || !body.html) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Build the Resend payload
  const resendPayload: Record<string, unknown> = {
    from: body.from ?? FROM_EMAIL,
    to: [body.to],
    subject: body.subject,
    html: body.html,
  }

  // Resend supports a text preview via the "text" field as a fallback
  if (body.preview) {
    resendPayload.text = body.preview
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload),
  })

  const resendData = await resendRes.json()

  if (!resendRes.ok) {
    console.error('[send-email] Resend error:', resendData)
    return new Response(JSON.stringify({ error: resendData }), {
      status: resendRes.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ id: resendData.id }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
