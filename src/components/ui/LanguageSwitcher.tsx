import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'tr', label: 'TR', full: 'Türkçe' },
]

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
)

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={['h-3 w-3 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
)

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
)

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation('common')
  const currentLang = i18n.language?.slice(0, 2) ?? 'en'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ?? SUPPORTED_LANGUAGES[0]

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code)
    try {
      window.localStorage.setItem('carebridge_lang', code)
    } catch {
      // ignore
    }
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={ref} className={['relative', className].filter(Boolean).join(' ')}>
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.select')}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/70 dark:text-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        <span className="text-slate-400 dark:text-slate-400"><GlobeIcon /></span>
        <span>{current.label}</span>
        <span className="text-slate-400 dark:text-slate-500"><ChevronIcon open={open} /></span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          aria-label={t('language.select')}
          className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/60 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang.code === currentLang
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isActive}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={[
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-bold tracking-wide text-slate-400 dark:text-slate-500 w-6">
                    {lang.label}
                  </span>
                  <span>{lang.full}</span>
                </span>
                {isActive && <CheckIcon />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
