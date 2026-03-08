/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type SiteSettings = {
  // Branding
  appName: string
  tagline: string
  hospitalName: string
  licenseNumber: string
  // Contact
  contactPhone: string
  contactEmail: string
  contactAddress: string
  officeHours: string
  emergencyPhone: string
  // About section
  aboutTitle: string
  aboutSubtitle: string
  aboutDescription: string
  // Feature cards
  feature1Title: string
  feature1Desc: string
  feature2Title: string
  feature2Desc: string
  feature3Title: string
  feature3Desc: string
  // Hero slides
  slide1Title: string
  slide1Subtitle: string
  slide1Image: string
  slide2Title: string
  slide2Subtitle: string
  slide2Image: string
  slide3Title: string
  slide3Subtitle: string
  slide3Image: string
  slide4Title: string
  slide4Subtitle: string
  slide4Image: string
  // CTA strip
  ctaHeading: string
  ctaDescription: string
  ctaButtonText: string
  // Social media
  socialFacebook: string
  socialTwitter: string
  socialInstagram: string
  socialLinkedin: string
  // Footer links
  privacyPolicyUrl: string
  termsUrl: string
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  appName: 'CareBridge',
  tagline: 'Your health, your way.',
  hospitalName: 'CareBridge Medical Center',
  licenseNumber: '',
  contactPhone: '(555) 123-4567',
  contactEmail: 'support@carebridge.health',
  contactAddress: '123 Health Way, Medical District, NY 10001',
  officeHours: 'Monday – Friday, 8:00 AM – 6:00 PM',
  emergencyPhone: '911',
  aboutTitle: 'About CareBridge',
  aboutSubtitle: 'Connecting patients with their healthcare',
  aboutDescription:
    'CareBridge is a modern healthcare patient portal that empowers patients to manage their health information, appointments, and communications with their care team — all in one secure place.',
  feature1Title: '24/7 Access',
  feature1Desc: 'View your health information anytime, on any device.',
  feature2Title: 'Secure by Design',
  feature2Desc: 'Built with HIPAA-aligned security practices to protect your data.',
  feature3Title: 'Care Coordination',
  feature3Desc: 'Stay connected with your entire healthcare team in one place.',
  slide1Title: 'Your Health, Your Way',
  slide1Subtitle:
    'Access your appointments, test results, and care team — all in one secure place.',
  slide1Image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80',
  slide2Title: 'Care At Your Fingertips',
  slide2Subtitle:
    'Modern healthcare tools designed to keep you informed and connected with your care team.',
  slide2Image: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1600&q=80',
  slide3Title: 'Your Records, Anytime',
  slide3Subtitle:
    'View medical summaries, lab results, and prescription history whenever you need them.',
  slide3Image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1600&q=80',
  slide4Title: 'Trusted & Secure',
  slide4Subtitle:
    'Built with HIPAA-aligned security practices to protect your most sensitive information.',
  slide4Image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1600&q=80',
  ctaHeading: 'Your health journey starts here',
  ctaDescription:
    'CareBridge is a modern healthcare patient portal that empowers patients to manage their health information, appointments, and communications with their care team — all in one secure place.',
  ctaButtonText: 'Get Started',
  socialFacebook: '',
  socialTwitter: '',
  socialInstagram: '',
  socialLinkedin: '',
  privacyPolicyUrl: '#',
  termsUrl: '#',
}

const STORAGE_KEY = 'carebridge_site_settings'

function loadSettings(): SiteSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...DEFAULT_SITE_SETTINGS, ...(JSON.parse(raw) as Partial<SiteSettings>) }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SITE_SETTINGS }
}

type SiteSettingsContextValue = {
  settings: SiteSettings
  updateSettings: (patch: Partial<SiteSettings>) => void
  resetSettings: () => void
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined)

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(loadSettings)

  const updateSettings = useCallback((patch: Partial<SiteSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setSettings({ ...DEFAULT_SITE_SETTINGS })
  }, [])

  const value = useMemo<SiteSettingsContextValue>(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  )

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext)
  if (!ctx) throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  return ctx
}
