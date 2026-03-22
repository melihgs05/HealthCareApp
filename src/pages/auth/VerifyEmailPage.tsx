import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isNeonConfigured } from '../../lib/neonClient'
import { verifyEmailToken } from '../../lib/neonAuth'

export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    if (isNeonConfigured) {
      verifyEmailToken(token)
        .then(() => {
          setStatus('success')
          setTimeout(() => navigate('/portal', { replace: true }), 2000)
        })
        .catch(() => setStatus('error'))
    } else {
      // Supabase handles email verification via its own redirect; reaching this
      // page in Supabase mode means the session is already confirmed.
      setStatus('success')
      setTimeout(() => navigate('/portal', { replace: true }), 2000)
    }
  }, [token, navigate])

  return (
    <div className="text-center">
      {status === 'verifying' && (
        <>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('auth:verifyEmail.verifying')}</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('auth:verifyEmail.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t('auth:verifyEmail.success')}
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-rose-600 dark:text-rose-400" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('auth:verifyEmail.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t('auth:verifyEmail.error')}
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            {t('auth:verifyEmail.backToLogin')}
          </Link>
        </>
      )}
    </div>
  )
}
