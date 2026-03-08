import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppNavbar } from '../components/ui/AppNavbar'
import { useAuth } from '../context/AuthContext'

const slides = [
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80',
    titleKey: 'slide1Title',
    subtitleKey: 'slide1Subtitle',
  },
  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1600&q=80',
    titleKey: 'slide2Title',
    subtitleKey: 'slide2Subtitle',
  },
  {
    id: 3,
    image:
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1600&q=80',
    titleKey: 'slide3Title',
    subtitleKey: 'slide3Subtitle',
  },
  {
    id: 4,
    image:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1600&q=80',
    titleKey: 'slide4Title',
    subtitleKey: 'slide4Subtitle',
  },
]

const slideContent: Record<string, string> = {
  slide1Title: 'Your Health, Your Way',
  slide1Subtitle: 'Access your appointments, test results, and care team — all in one secure place.',
  slide2Title: 'Care At Your Fingertips',
  slide2Subtitle: 'Modern healthcare tools designed to keep you informed and connected with your care team.',
  slide3Title: 'Your Records, Anytime',
  slide3Subtitle: 'View medical summaries, lab results, and prescription history whenever you need them.',
  slide4Title: 'Trusted & Secure',
  slide4Subtitle: 'Built with HIPAA-aligned security practices to protect your most sensitive information.',
}

const slideContentTr: Record<string, string> = {
  slide1Title: 'Sağlığınız, Sizin Yolunuzla',
  slide1Subtitle: 'Randevularınıza, test sonuçlarınıza ve sağlık ekibinize — tek güvenli bir yerden erişin.',
  slide2Title: 'Bakım Parmaklarınızın Ucunda',
  slide2Subtitle: 'Sizi bilgili ve sağlık ekibinizle bağlantıda tutmak için tasarlanmış modern sağlık araçları.',
  slide3Title: 'Kayıtlarınız, İstediğiniz Zaman',
  slide3Subtitle: 'Tıbbi özetleri, lab sonuçlarını ve reçete geçmişini istediğiniz zaman görüntüleyin.',
  slide4Title: 'Güvenilir & Güvenli',
  slide4Subtitle: 'En hassas bilgilerinizi korumak için HIPAA uyumlu güvenlik uygulamalarıyla geliştirilmiştir.',
}

function useTranslatedSlideContent(key: string): string {
  const { i18n } = useTranslation()
  const lang = i18n.language?.slice(0, 2) ?? 'en'
  const map = lang === 'tr' ? slideContentTr : slideContent
  return map[key] ?? ''
}

function SlideText({ titleKey, subtitleKey }: { titleKey: string; subtitleKey: string }) {
  const title = useTranslatedSlideContent(titleKey)
  const subtitle = useTranslatedSlideContent(subtitleKey)
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-base text-white/90 drop-shadow sm:text-lg">
        {subtitle}
      </p>
    </>
  )
}

function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { t } = useTranslation()
  const navigate = useNavigate()

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, 5000)
  }, [])

  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, resetTimer])

  const goTo = (idx: number) => {
    setCurrent(idx)
    resetTimer()
  }

  const prev = () => goTo((current - 1 + slides.length) % slides.length)
  const next = () => goTo((current + 1) % slides.length)

  return (
    <section className="relative h-[85vh] min-h-[480px] w-full overflow-hidden">
      {/* Slides */}
      {slides.map((slide, idx) => (
        <div
          key={slide.id}
          className={[
            'absolute inset-0 transition-opacity duration-700',
            idx === current ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
        >
          <img
            src={slide.image}
            alt=""
            className="h-full w-full object-cover"
            loading={idx === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        </div>
      ))}

      {/* Text overlay */}
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={[
                'transition-opacity duration-700',
                idx === current ? 'opacity-100' : 'opacity-0 absolute',
              ].join(' ')}
            >
              {idx === current && (
                <SlideText titleKey={slide.titleKey} subtitleKey={slide.subtitleKey} />
              )}
            </div>
          ))}
          {/* CTA buttons */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-500"
            >
              {t('actions.getStarted')}
            </button>
            <a
              href="#about"
              className="rounded-full border border-white/60 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {t('actions.learnMore')}
            </a>
          </div>
        </div>
      </div>

      {/* Arrow controls */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={[
              'h-2 rounded-full transition-all duration-300',
              idx === current
                ? 'w-6 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/80',
            ].join(' ')}
          />
        ))}
      </div>
    </section>
  )
}

export function LandingPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const handleAccountClick = () => {
    if (isAuthenticated && user) {
      const target =
        user.role === 'doctor' ? '/doctor' : user.role === 'admin' ? '/admin' : '/portal'
      navigate(target)
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <AppNavbar showLinks />

      {/* Hero Carousel - id="home" */}
      <div id="home" className="pt-16">
        <HeroCarousel />
      </div>

      {/* About section */}
      <section id="about" className="bg-white py-20 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
              {t('about.title')}
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('about.subtitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-400">
              {t('about.description')}
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                titleKey: 'about.feature1Title',
                descKey: 'about.feature1Desc',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                ),
                color: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
              },
              {
                titleKey: 'about.feature2Title',
                descKey: 'about.feature2Desc',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
              },
              {
                titleKey: 'about.feature3Title',
                descKey: 'about.feature3Desc',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  </svg>
                ),
                color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
              },
            ].map((feature) => (
              <div
                key={feature.titleKey}
                className="rounded-3xl bg-slate-50 p-8 dark:bg-slate-800"
              >
                <div className={['inline-flex h-12 w-12 items-center justify-center rounded-2xl', feature.color].join(' ')}>
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {t(feature.titleKey)}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t(feature.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-sky-600 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {t('appName')} — {t('tagline')}
          </h2>
          <p className="mt-3 text-sky-100">
            {t('about.description')}
          </p>
          <button
            type="button"
            onClick={handleAccountClick}
            className="mt-6 rounded-full bg-white px-8 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            {t('actions.getStarted')}
          </button>
        </div>
      </section>

      {/* Contacts section */}
      <section id="contacts" className="bg-white py-20 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
              {t('contacts.title')}
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('nav.contacts')}
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                label: t('contacts.phone'),
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ),
              },
              {
                label: t('contacts.email'),
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
                  </svg>
                ),
              },
              {
                label: t('contacts.address'),
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-4 rounded-3xl bg-slate-50 p-6 dark:bg-slate-800"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                  {item.icon}
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-3xl bg-slate-50 p-6 text-center dark:bg-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Office Hours
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {t('contacts.hours')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-8 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-600 text-[0.6rem] font-bold text-white">
                CB
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('appName')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} {t('appName')}. {t('footer.rights')}
            </p>
            <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
              <a href="#" className="hover:text-sky-600">
                {t('footer.privacy')}
              </a>
              <a href="#" className="hover:text-sky-600">
                {t('footer.terms')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
