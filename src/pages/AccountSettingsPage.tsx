import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export function AccountSettingsPage() {
  const { user } = useAuth()
  const { t } = useTranslation('common')

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleProfile = (e: FormEvent) => {
    e.preventDefault()
    toast.success(t('settings.profileSaved'))
  }

  const handlePassword = (e: FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t('settings.passwordTooShort'))
      return
    }
    toast.success(t('settings.passwordSaved'))
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const inputClass =
    'block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-600 dark:focus:ring-sky-900'
  const labelClass =
    'block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400'

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('settings.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Profile card */}
      <form
        onSubmit={handleProfile}
        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700 space-y-5"
      >
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {t('settings.profileSection')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelClass}>{t('settings.fullName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Alex Johnson"
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('settings.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="alex@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('settings.phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('settings.city')}</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
              placeholder="New York"
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className={labelClass}>{t('settings.address')}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder="123 Main St, Apt 4B"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          {t('settings.saveProfile')}
        </button>
      </form>

      {/* Password card */}
      <form
        onSubmit={handlePassword}
        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700 space-y-5"
      >
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {t('settings.passwordSection')}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1">
            <label className={labelClass}>{t('settings.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('settings.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('settings.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          {t('settings.savePassword')}
        </button>
      </form>
    </div>
  )
}
