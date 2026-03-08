import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { useAuth } from '../../context/AuthContext'

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

interface AppNavbarProps {
  showLinks?: boolean
}

export function AppNavbar({ showLinks = false }: AppNavbarProps) {
  const { t } = useTranslation('common')
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const portalPath =
    user?.role === 'doctor'
      ? '/doctor'
      : user?.role === 'admin'
        ? '/admin'
        : '/portal'

  const accountSettingsPath =
    user?.role === 'doctor'
      ? '/doctor/settings'
      : user?.role === 'admin'
        ? '/admin/settings'
        : '/portal/settings'

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
        <Link to="/" className="flex items-center gap-2.5">
          {/* Modern medical cross icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <span className="text-sm text-slate-900 dark:text-white">
            {t('appName')}
          </span>
        </Link>

        {/* Desktop section links */}
        {showLinks && (
          <div className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm font-medium text-slate-600 transition hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">{t('nav.home')}</a>
            <a href="#about" className="text-sm font-medium text-slate-600 transition hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">{t('nav.about')}</a>
            <a href="#contacts" className="text-sm font-medium text-slate-600 transition hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">{t('nav.contacts')}</a>
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell />

          {isAuthenticated && user ? (
            /* User dropdown */
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white shadow-sm transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1"
                aria-label="User menu"
              >
                {getInitials(user.name)}
              </button>

              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-52 origin-top-right rounded-2xl bg-white py-1 shadow-lg ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                    {/* User info header */}
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-[0.7rem] text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); navigate(portalPath) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {t('nav.portal')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); navigate(accountSettingsPath) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                      </svg>
                      {t('settings.accountSettings')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); logout(); navigate('/') }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                      </svg>
                      {t('settings.signOut')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAccountClick}
              className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
            >
              {t('nav.account')}
            </button>
          )}

          {/* Mobile hamburger */}
          {showLinks && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 md:hidden dark:text-slate-300"
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

      {/* Mobile dropdown */}
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
