import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import type { UserRole, PersonnelSubrole } from '../../api/types'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('alex.johnson@example.com')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('patient')
  const [subrole, setSubrole] = useState<PersonnelSubrole>('lab')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login({ email, password, role })
      const target =
        role === 'doctor' ? '/doctor'
        : role === 'admin' ? '/admin'
        : role === 'personnel' ? '/staff'
        : '/portal'
      navigate(target, { replace: true })
    } catch {
      setError(t('auth:login.error'))
    } finally {
      setIsSubmitting(false)
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

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

        <fieldset className="space-y-2 text-xs">
          <legend className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
            {t('auth:login.signinAs')}
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['patient', t('auth:roles.patient')] as const,
              ['doctor', t('auth:roles.doctor')] as const,
              ['admin', t('auth:roles.admin')] as const,
              ['personnel', t('auth:roles.personnel')] as const,
            ]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value as UserRole)}
                className={[
                  'rounded-xl border px-2 py-1.5 text-xs font-medium transition',
                  role === value
                    ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-900/30 dark:text-sky-200'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-sky-500',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          {role === 'personnel' && (
            <div className="mt-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
                {t('auth:subroles.lab') === 'Laboratory Tech' ? 'Staff type' : 'Personel türü'}
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {([
                  ['lab', t('auth:subroles.lab')] as const,
                  ['nurse', t('auth:subroles.nurse')] as const,
                  ['desk', t('auth:subroles.desk')] as const,
                ]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSubrole(value)}
                    className={[
                      'rounded-xl border px-2 py-1.5 text-xs font-medium transition',
                      subrole === value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </fieldset>

        <div className="space-y-1 text-sm">
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400"
          >
            {t('auth:login.password')}
          </label>
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
          disabled={isSubmitting}
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

