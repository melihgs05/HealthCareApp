/**
 * OAuth Callback page.
 *
 * Handles the redirect back from Google (or any OAuth provider).
 *
 * Supabase mode — SDK resolves the session from the URL automatically.
 *   We just wait for the auth state and then navigate.
 *
 * Neon mode (id_token implicit flow) — Google returns a signed id_token
 *   JWT in the URL hash. We decode it client-side to extract the user
 *   profile and call neonSignInWithGoogle to create/find the user.
 *   No client secret or server-side exchange is required for this flow.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { isNeonConfigured } from '../../lib/neonClient'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { neonSignInWithGoogle } from '../../lib/neonAuth'

function roleHomePath(role: string): string {
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  if (role === 'personnel') return '/staff'
  return '/portal'
}

/** Base64url → standard base64 → decode UTF-8 JSON */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json) as Record<string, unknown>
}

export function OAuthCallbackPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNeonConfigured) {
      // Parse the id_token and state from the URL hash
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const idToken = hashParams.get('id_token')
      const returnedState = hashParams.get('state')

      const savedState = sessionStorage.getItem('oauth_state')
      sessionStorage.removeItem('oauth_state')
      sessionStorage.removeItem('oauth_nonce')

      if (!idToken) {
        setError('Google did not return an id_token. Make sure your Google OAuth 2.0 client is configured as a Web application with this origin allowed.')
        return
      }

      if (returnedState !== savedState) {
        setError('OAuth state mismatch — possible CSRF. Please try signing in again.')
        return
      }

      let payload: Record<string, unknown>
      try {
        payload = decodeJwtPayload(idToken)
      } catch {
        setError('Failed to decode the Google id_token. Please try again.')
        return
      }

      const googleId = payload.sub as string | undefined
      const email = payload.email as string | undefined
      const name = (payload.name as string | undefined) ?? email ?? 'Google User'
      const avatarUrl = (payload.picture as string | undefined) ?? null

      if (!googleId || !email) {
        setError('Google did not return required profile fields (sub, email).')
        return
      }

      neonSignInWithGoogle({ googleId, email, name, avatarUrl })
        .then((session) => {
          // Reload the page so AuthContext picks up the session from localStorage
          window.location.replace(roleHomePath(session.role))
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Google sign-in failed.')
        })
      return
    }

    if (isSupabaseConfigured) {
      // Supabase resolves the session from the URL automatically.
      const timeout = setTimeout(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) setError(t('auth:login.error'))
        })
      }, 1500)
      return () => clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Navigate once AuthContext has the user (Supabase path)
  useEffect(() => {
    if (user) {
      navigate(roleHomePath(user.role), { replace: true })
    }
  }, [user, navigate])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-sm text-rose-600 dark:text-rose-400 max-w-sm">{error}</p>
        <a href="/login" className="text-sm text-sky-600 hover:underline dark:text-sky-400">
          {t('auth:login.backToLogin')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('auth:login.signingIn')}</p>
    </div>
  )
}

