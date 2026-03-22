import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

function roleHomePath(role: string): string {
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  if (role === 'personnel') return '/staff'
  return '/portal'
}

export function LoginPage() {
  const { login, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const role = await login({ email, password })
      navigate(roleHomePath(role), { replace: true })
    } catch {
      setError(t('auth:login.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:login.error'))
      setIsGoogleLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {t('auth:login.title')}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t('auth:login.subtitle')}
      </p>

      {/* Google sign-in */}
      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={isGoogleLoading || isSubmitting}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {isGoogleLoading ? '…' : t('auth:login.googleSignIn')}
      </button>

      <div className="my-4 flex items-center gap-3">
        <hr className="flex-1 border-slate-200 dark:border-slate-600" />
        <span className="text-xs text-slate-400">{t('auth:login.orContinueWith')}</span>
        <hr className="flex-1 border-slate-200 dark:border-slate-600" />
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1 text-sm">
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
          >
            {t('auth:login.email')}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-600 dark:focus:ring-sky-900"
          />
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              {t('auth:login.password')}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              {t('auth:login.forgotPassword')}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-600 dark:focus:ring-sky-900"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400 dark:bg-sky-700 dark:hover:bg-sky-600 dark:disabled:bg-sky-900"
        >
          {isSubmitting ? t('auth:login.signingIn') : t('auth:login.signIn')}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        {t('auth:login.noAccount')}{' '}
        <Link
          to="/signup"
          className="font-medium text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {t('auth:login.createAccount')}
        </Link>
        .
      </p>
    </div>
  )
}

