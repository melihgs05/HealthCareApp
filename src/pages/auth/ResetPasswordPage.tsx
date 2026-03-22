import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

export function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation('auth')

  const token = searchParams.get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError(t('auth:resetPassword.invalidToken'))
  }, [token, t])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError(t('auth:resetPassword.passwordMismatch'))
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await confirmPasswordReset(token, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:resetPassword.invalidToken'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t('auth:resetPassword.title')}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('auth:resetPassword.success')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {t('auth:resetPassword.title')}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t('auth:resetPassword.subtitle')}
      </p>

      {error && !isSubmitting && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <div className="space-y-1 text-sm">
          <label
            htmlFor="new-password"
            className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
          >
            {t('auth:resetPassword.newPassword')}
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-600 dark:focus:ring-sky-900"
          />
        </div>

        <div className="space-y-1 text-sm">
          <label
            htmlFor="confirm-password"
            className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
          >
            {t('auth:resetPassword.confirmPassword')}
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-600 dark:focus:ring-sky-900"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !token}
          className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400 dark:bg-sky-700 dark:hover:bg-sky-600 dark:disabled:bg-sky-900"
        >
          {isSubmitting ? t('auth:resetPassword.submitting') : t('auth:resetPassword.submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <Link
          to="/login"
          className="font-medium text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {t('auth:resetPassword.backToLogin')}
        </Link>
      </p>
    </div>
  )
}
