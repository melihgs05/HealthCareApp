import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppNavbar } from '../components/ui/AppNavbar'

export function AuthLayout() {
  const { t } = useTranslation(['auth', 'common'])

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-900">
      <AppNavbar />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-8 pt-24">
        <div className="grid w-full gap-10 rounded-3xl bg-white/80 p-8 shadow-xl shadow-sky-100 ring-1 ring-sky-100 dark:bg-slate-800 dark:shadow-slate-900 dark:ring-slate-700 md:grid-cols-[1.1fr,0.9fr] md:p-10">
          <section className="flex flex-col justify-between gap-8">
            <header>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('auth:portal.securePortalBadge')}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                {t('auth:portal.title')}
                <span className="block text-sky-700 dark:text-sky-400">
                  {t('auth:portal.titleHighlight')}
                </span>
              </h1>
              <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-400 md:text-base">
                {t('auth:portal.description')}
              </p>
            </header>

            <dl className="grid grid-cols-2 gap-4 text-xs text-slate-600 md:text-sm">
              <div className="rounded-2xl bg-sky-50 px-4 py-3 dark:bg-sky-900/20">
                <dt className="font-medium text-sky-900 dark:text-sky-300">
                  {t('auth:portal.feature247Title')}
                </dt>
                <dd className="mt-1 text-sky-700 dark:text-sky-400">
                  {t('auth:portal.feature247Desc')}
                </dd>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
                <dt className="font-medium text-emerald-900 dark:text-emerald-300">
                  {t('auth:portal.featureSecureTitle')}
                </dt>
                <dd className="mt-1 text-emerald-700 dark:text-emerald-400">
                  {t('auth:portal.featureSecureDesc')}
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <Outlet />
              <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                {t('auth:portal.demoNotice')}
              </p>
            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('common:appName')} · Patient Portal MVP
        </p>
      </div>
    </div>
  )
}

