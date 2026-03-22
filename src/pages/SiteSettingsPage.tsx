import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  useSiteSettings,
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from '../context/SiteSettingsContext'

type Tab = 'branding' | 'contact' | 'landing' | 'social'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-900/40'

const labelClass = 'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400'

const sectionClass =
  'rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50'

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          className={`${inputClass} resize-none`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

export function SiteSettingsPage() {
  const { t } = useTranslation('admin')
  const { settings, updateSettings, resetSettings } = useSiteSettings()
  const [activeTab, setActiveTab] = useState<Tab>('branding')
  const [local, setLocal] = useState<SiteSettings>({ ...settings })
  const logoInputRef = useRef<HTMLInputElement>(null)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'branding', label: t('siteSettings.tabBranding') },
    { id: 'contact', label: t('siteSettings.tabContact') },
    { id: 'landing', label: t('siteSettings.tabLanding') },
    { id: 'social', label: t('siteSettings.tabSocial') },
  ]

  const set = (key: keyof SiteSettings) => (value: string) =>
    setLocal((prev) => ({ ...prev, [key]: value }))

  const setLogoUrl = (value: string) => {
    setLocal((prev) => ({ ...prev, logoUrl: value }))
    updateSettings({ logoUrl: value })
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogoUrl(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    updateSettings(local)
    toast.success(t('siteSettings.savedToast'))
  }

  const handleReset = () => {
    resetSettings()
    setLocal({ ...DEFAULT_SITE_SETTINGS })
    toast(t('siteSettings.resetToast'), { icon: '↩️' })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('siteSettings.title')}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t('siteSettings.subtitle')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {t('siteSettings.resetButton')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
          >
            {t('siteSettings.saveButton')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'rounded-xl px-4 py-2 text-xs font-medium transition',
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">

        {/* ── Branding ── */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('siteSettings.branding.sectionTitle')}
            </h3>

            {/* Logo */}
            <div>
              <p className={labelClass}>{t('siteSettings.branding.logoSectionTitle')}</p>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 space-y-3">
                {local.logoUrl && (
                  <div className="flex items-center gap-3">
                    <img
                      src={local.logoUrl}
                      alt={t('siteSettings.branding.logoPreviewAlt')}
                      className="h-12 max-w-[160px] object-contain rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="rounded-xl border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800/50 dark:bg-slate-800 dark:text-rose-400"
                    >
                      {t('siteSettings.branding.logoRemove')}
                    </button>
                  </div>
                )}
                <Field
                  label={t('siteSettings.branding.logoUrlLabel')}
                  value={local.logoUrl}
                  onChange={setLogoUrl}
                  placeholder={t('siteSettings.branding.logoUrlPlaceholder')}
                />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileChange}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  📁 {t('siteSettings.branding.logoUploadLabel')}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('siteSettings.branding.appNameLabel')}
                value={local.appName}
                onChange={set('appName')}
                placeholder="CareBridge"
              />
              <Field
                label={t('siteSettings.branding.taglineLabel')}
                value={local.tagline}
                onChange={set('tagline')}
                placeholder="Your health, your way."
              />
              <Field
                label={t('siteSettings.branding.hospitalNameLabel')}
                value={local.hospitalName}
                onChange={set('hospitalName')}
                placeholder="CareBridge Medical Center"
              />
              <Field
                label={t('siteSettings.branding.licenseLabel')}
                value={local.licenseNumber}
                onChange={set('licenseNumber')}
                placeholder={t('siteSettings.branding.licensePlaceholder')}
              />
            </div>
          </div>
        )}

        {/* ── Contact ── */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('siteSettings.contact.sectionTitle')}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('siteSettings.contact.phoneLabel')}
                value={local.contactPhone}
                onChange={set('contactPhone')}
                placeholder="(555) 123-4567"
              />
              <Field
                label={t('siteSettings.contact.emergencyPhoneLabel')}
                value={local.emergencyPhone}
                onChange={set('emergencyPhone')}
                placeholder="911"
              />
              <Field
                label={t('siteSettings.contact.emailLabel')}
                value={local.contactEmail}
                onChange={set('contactEmail')}
                placeholder="support@carebridge.health"
              />
              <Field
                label={t('siteSettings.contact.hoursLabel')}
                value={local.officeHours}
                onChange={set('officeHours')}
                placeholder="Mon–Fri, 8:00 AM – 6:00 PM"
              />
              <div className="sm:col-span-2">
                <Field
                  label={t('siteSettings.contact.addressLabel')}
                  value={local.contactAddress}
                  onChange={set('contactAddress')}
                  placeholder="123 Health Way, Medical District, NY 10001"
                  multiline
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Landing Page ── */}
        {activeTab === 'landing' && (
          <div className="space-y-8">

            {/* Hero slides */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('siteSettings.landing.heroTitle')}
              </h3>
              <div className="space-y-4">
                {([1, 2, 3, 4] as const).map((n) => (
                  <div key={n} className={sectionClass}>
                    <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">
                      {t('siteSettings.landing.slideLabel', { n })}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label={t('siteSettings.landing.slideTitleLabel')}
                        value={local[`slide${n}Title` as keyof SiteSettings]}
                        onChange={set(`slide${n}Title` as keyof SiteSettings)}
                      />
                      <Field
                        label={t('siteSettings.landing.slideSubtitleLabel')}
                        value={local[`slide${n}Subtitle` as keyof SiteSettings]}
                        onChange={set(`slide${n}Subtitle` as keyof SiteSettings)}
                      />
                      <div className="sm:col-span-2">
                        <Field
                          label={t('siteSettings.landing.slideImageLabel')}
                          value={local[`slide${n}Image` as keyof SiteSettings]}
                          onChange={set(`slide${n}Image` as keyof SiteSettings)}
                          placeholder={t('siteSettings.landing.slideImagePlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* About section */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('siteSettings.landing.aboutTitle')}
              </h3>
              <div className={sectionClass}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t('siteSettings.landing.aboutLabelLabel')}
                    value={local.aboutTitle}
                    onChange={set('aboutTitle')}
                    placeholder="About CareBridge"
                  />
                  <Field
                    label={t('siteSettings.landing.aboutHeadingLabel')}
                    value={local.aboutSubtitle}
                    onChange={set('aboutSubtitle')}
                    placeholder="Connecting patients with their healthcare"
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label={t('siteSettings.landing.aboutDescLabel')}
                      value={local.aboutDescription}
                      onChange={set('aboutDescription')}
                      multiline
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature cards */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('siteSettings.landing.featureCardsTitle')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {([1, 2, 3] as const).map((n) => (
                  <div key={n} className={sectionClass}>
                    <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">
                      {t('siteSettings.landing.cardLabel', { n })}
                    </p>
                    <div className="space-y-3">
                      <Field
                        label={t('siteSettings.landing.cardTitleLabel')}
                        value={local[`feature${n}Title` as keyof SiteSettings]}
                        onChange={set(`feature${n}Title` as keyof SiteSettings)}
                      />
                      <Field
                        label={t('siteSettings.landing.cardDescLabel')}
                        value={local[`feature${n}Desc` as keyof SiteSettings]}
                        onChange={set(`feature${n}Desc` as keyof SiteSettings)}
                        multiline
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA strip */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('siteSettings.landing.ctaTitle')}
              </h3>
              <div className={sectionClass}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t('siteSettings.landing.ctaHeadingLabel')}
                    value={local.ctaHeading}
                    onChange={set('ctaHeading')}
                    placeholder="Your health journey starts here"
                  />
                  <Field
                    label={t('siteSettings.landing.ctaButtonTextLabel')}
                    value={local.ctaButtonText}
                    onChange={set('ctaButtonText')}
                    placeholder="Get Started"
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label={t('siteSettings.landing.ctaDescLabel')}
                      value={local.ctaDescription}
                      onChange={set('ctaDescription')}
                      multiline
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Social & Links ── */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('siteSettings.social.socialTitle')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t('siteSettings.social.facebookLabel')}
                  value={local.socialFacebook}
                  onChange={set('socialFacebook')}
                  placeholder="https://facebook.com/yourclinic"
                />
                <Field
                  label={t('siteSettings.social.twitterLabel')}
                  value={local.socialTwitter}
                  onChange={set('socialTwitter')}
                  placeholder="https://twitter.com/yourclinic"
                />
                <Field
                  label={t('siteSettings.social.instagramLabel')}
                  value={local.socialInstagram}
                  onChange={set('socialInstagram')}
                  placeholder="https://instagram.com/yourclinic"
                />
                <Field
                  label={t('siteSettings.social.linkedinLabel')}
                  value={local.socialLinkedin}
                  onChange={set('socialLinkedin')}
                  placeholder="https://linkedin.com/company/yourclinic"
                />
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('siteSettings.social.footerTitle')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t('siteSettings.social.privacyLabel')}
                  value={local.privacyPolicyUrl}
                  onChange={set('privacyPolicyUrl')}
                  placeholder="/privacy or https://..."
                />
                <Field
                  label={t('siteSettings.social.termsLabel')}
                  value={local.termsUrl}
                  onChange={set('termsUrl')}
                  placeholder="/terms or https://..."
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
