import { type FormEvent, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useDatabaseMode } from '../context/DatabaseModeContext'
import { createPatientRecord } from '../api/adminApi'

export function RegisterPatientPage() {
  const { user } = useAuth()
  const { isDemoMode } = useDatabaseMode()
  const { t } = useTranslation('admin')

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [insurance, setInsurance] = useState('')
  const [email, setEmail] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastRegistered, setLastRegistered] = useState<{ name: string; mrn: string } | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name || !dob) return
    setSubmitting(true)
    try {
      let mrn = `MRN-DEMO-${Date.now().toString(36).toUpperCase()}`
      if (!isDemoMode) {
        const resolvedEmail = email.trim()
          ? email.trim()
          : `${name.toLowerCase().replace(/\s+/g, '.')}@carebridge.demo`
        const result = await createPatientRecord({
          name,
          email: resolvedEmail,
          password: tempPassword || undefined,
          dob,
          phone: phone || undefined,
          insurance: insurance || undefined,
          createdBy: user?.id ?? 'staff',
        })
        mrn = result.mrn
      }
      setLastRegistered({ name, mrn })
      toast.success(t('admin:registerPatient.successToast', { name }))
      setName('')
      setDob('')
      setPhone('')
      setInsurance('')
      setEmail('')
      setTempPassword('')
    } catch {
      toast.error(t('admin:registerPatient.errorToast'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900'
  const labelCls = 'text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400'

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('admin:registerPatient.title')}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('admin:registerPatient.subtitle')}
        </p>
      </header>

      {lastRegistered && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            {t('admin:registerPatient.successBanner', { name: lastRegistered.name, mrn: lastRegistered.mrn })}
          </p>
        </div>
      )}

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-name" className={labelCls}>
                {t('admin:registerPatient.nameLabel')} *
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('admin:registerPatient.namePlaceholder')}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="reg-dob" className={labelCls}>
                {t('admin:registerPatient.dobLabel')} *
              </label>
              <input
                id="reg-dob"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className={labelCls}>
                {t('admin:registerPatient.phoneLabel')}
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('admin:registerPatient.phonePlaceholder')}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="reg-insurance" className={labelCls}>
                {t('admin:registerPatient.insuranceLabel')}
              </label>
              <input
                id="reg-insurance"
                type="text"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                placeholder={t('admin:registerPatient.insurancePlaceholder')}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="reg-email" className={labelCls}>
                {t('admin:registerPatient.emailLabel')}
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('admin:registerPatient.emailPlaceholder')}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="reg-password" className={labelCls}>
                {t('admin:registerPatient.tempPasswordLabel')}
              </label>
              <div className="relative mt-1">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder={t('admin:registerPatient.tempPasswordPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 pr-16 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  {showPassword ? t('admin:registerPatient.hidePassword') : t('admin:registerPatient.showPassword')}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {submitting
                ? t('admin:registerPatient.submitting')
                : t('admin:registerPatient.submitButton')}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
