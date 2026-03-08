import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'tr', label: 'TR' },
]

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const currentLang = i18n.language?.slice(0, 2) ?? 'en'

  const handleChange = (code: string) => {
    i18n.changeLanguage(code)
    try {
      window.localStorage.setItem('carebridge_lang', code)
    } catch {
      // ignore
    }
  }

  return (
    <div className={['flex items-center gap-1', className].filter(Boolean).join(' ')} aria-label={t('language.select')}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => handleChange(lang.code)}
          className={[
            'rounded-full px-2 py-1 text-[0.65rem] font-semibold transition-colors',
            currentLang === lang.code
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
          ].join(' ')}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
