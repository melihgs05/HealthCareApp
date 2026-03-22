/**
 * Email service abstraction for CareBridge.
 *
 * Behaviour:
 *  1. When VITE_EMAIL_API_URL is set — POSTs the payload to that endpoint.
 *     Point this at your deployed Supabase Edge Function (send-email).
 *  2. Otherwise (demo / local) — logs to console only. No email is sent.
 *
 * Required environment variables:
 *   VITE_EMAIL_API_URL   https://<project>.supabase.co/functions/v1/send-email
 *   VITE_EMAIL_FROM      CareBridge <noreply@yourdomain.com>   (optional)
 *   VITE_APP_URL         https://yourapp.com                   (optional, defaults to origin)
 */

import axios from 'axios'

const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL as string | undefined
const EMAIL_FROM = (import.meta.env.VITE_EMAIL_FROM as string | undefined) ?? 'CareBridge <noreply@carebridge.health>'
const APP_BASE_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin

export type EmailPayload = {
  to: string
  subject: string
  html: string
  preview?: string
}

/** True when email API is configured */
export const isEmailConfigured = Boolean(EMAIL_API_URL)

/**
 * Sends an email via the configured server-side endpoint.
 * In demo mode (no API URL) it resolves immediately without sending.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!EMAIL_API_URL) {
    console.info('[EmailService demo] Would send email:', payload)
    return
  }
  await axios.post(EMAIL_API_URL, { from: EMAIL_FROM, ...payload })
}

// ── Shared template wrapper ────────────────────────────────────────────────

function emailWrapper(content: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>CareBridge</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Preview text (hidden) -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</span>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">

          <!-- Header / Brand -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0ea5e9;border-radius:12px;padding:10px 20px;">
                    <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Care<span style="font-weight:400;">Bridge</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">CareBridge — Secure Patient Portal</p>
              <p style="margin:0;font-size:12px;color:#cbd5e1;">This is an automated message. Please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btnStyle(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="border-radius:8px;background-color:#0ea5e9;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.1px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function fallbackLink(href: string): string {
  return `<p style="margin:0;font-size:12px;color:#94a3b8;">Or paste this link into your browser:<br/>
    <a href="${href}" style="color:#0ea5e9;word-break:break-all;">${href}</a></p>`
}

// ── Email templates ────────────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`
  const preview = 'Please verify your email address to activate your CareBridge account.'
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Verify your email address</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">Hi ${name}, welcome to CareBridge! Click the button below to verify your email and activate your account. This link expires in <strong>24 hours</strong>.</p>
    ${btnStyle(link, 'Verify my email')}
    ${fallbackLink(link)}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="margin:0;font-size:13px;color:#94a3b8;">If you did not create a CareBridge account, you can safely ignore this email.</p>
  `
  await sendEmail({ to, subject: 'Verify your CareBridge email address', preview, html: emailWrapper(content, preview) })
}

export async function sendWelcomeWithCredentials(
  to: string,
  name: string,
  tempPassword: string,
  role: string,
): Promise<void> {
  const loginLink = `${APP_BASE_URL}/login`
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
  const preview = `Your ${roleLabel} account on CareBridge is ready. Sign in with your temporary password.`
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Your account is ready</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">Hi ${name}, an administrator has created a <strong>${roleLabel}</strong> account for you on CareBridge.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Your login credentials</p>
          <p style="margin:0 0 6px;font-size:15px;color:#0f172a;"><strong>Email:</strong> ${to}</p>
          <p style="margin:0;font-size:15px;color:#0f172a;"><strong>Temporary password:</strong> <code style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-size:14px;font-family:monospace;">${tempPassword}</code></p>
        </td>
      </tr>
    </table>

    ${btnStyle(loginLink, 'Sign in to CareBridge')}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fff7ed;border-left:4px solid #f97316;border-radius:4px;margin:0 0 24px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.5;">⚠ For your security, please change your password immediately after signing in.</p>
        </td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="margin:0;font-size:13px;color:#94a3b8;">If you did not expect this email, please contact your system administrator.</p>
  `
  await sendEmail({ to, subject: `Your CareBridge ${roleLabel} account`, preview, html: emailWrapper(content, preview) })
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`
  const preview = 'Reset your CareBridge password. This link expires in 1 hour.'
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Reset your password</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">Hi ${name}, we received a request to reset the password for your CareBridge account. Click the button below — this link expires in <strong>1 hour</strong>.</p>
    ${btnStyle(link, 'Reset my password')}
    ${fallbackLink(link)}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="margin:0;font-size:13px;color:#94a3b8;">If you did not request a password reset, your account is safe and you can ignore this email. No changes have been made.</p>
  `
  await sendEmail({ to, subject: 'Reset your CareBridge password', preview, html: emailWrapper(content, preview) })
}

