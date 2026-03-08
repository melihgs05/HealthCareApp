import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { useAuth } from '../../context/AuthContext'

interface AppNavbarProps {
  /** Show the Home / About / Contacts anchor links (landing page only) */
  showLinks?: boolean
}

export function AppNavbar({ showLinks = false }: AppNavbarProps) {
  const { t } = useTranslation('common')
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <nav className="fixed top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-md dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-xs font-bold text-white">
            CB
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('appName')}
          </span>
        </Link>

        {/* Desktop section links — landing page only */}
        {showLinks && (
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#home"
              className="text-sm font-medium text-slate-600 transition hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"
            >
              {t('nav.home')}
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-slate-600 transition hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"
            >
              {t('nav.about')}
            </a>
            <a
              href="#contacts"
              className="text-sm font-medium text-slate-600 transition hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400"
            >
              {t('nav.contacts')}
            </a>
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell />
          <button
            type="button"
            onClick={handleAccountClick}
            className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
          >
            {isAuthenticated ? (user?.name ?? t('nav.account')) : t('nav.account')}
          </button>

          {/* Mobile hamburger — landing page only */}
          {showLinks && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 md:hidden dark:text-slate-300"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown — landing page only */}
      {showLinks && mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 space-y-2 md:hidden dark:border-slate-700 dark:bg-slate-900">
          {[
            { href: '#home', label: t('nav.home') },
            { href: '#about', label: t('nav.about') },
            { href: '#contacts', label: t('nav.contacts') },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  )
}
