import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../context/NotificationsContext'

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  alert: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

export function NotificationBell({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className={['relative', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('notifications.title')}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
      >
        {/* Bell icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-5-5.917V4a1 1 0 1 0-2 0v1.083A6 6 0 0 0 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[0.6rem] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl bg-white shadow-xl ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[0.6rem] font-medium text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                  {unreadCount} {t('notifications.unread')}
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[0.65rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <ul className="max-h-80 divide-y divide-slate-50 overflow-y-auto dark:divide-slate-700">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-400">
                {t('notifications.noNotifications')}
              </li>
            ) : (
              notifications.map((notif) => (
                <li
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={[
                    'cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50',
                    !notif.read ? 'bg-sky-50/60 dark:bg-sky-900/10' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    <span className={['mt-0.5 rounded-full px-2 py-0.5 text-[0.6rem] font-medium', TYPE_COLORS[notif.type] ?? TYPE_COLORS.info].join(' ')}>
                      {notif.type}
                    </span>
                    {!notif.read && (
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-900 dark:text-slate-100">
                    {notif.title}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] leading-relaxed text-slate-600 dark:text-slate-400">
                    {notif.message}
                  </p>
                  <p className="mt-1 text-[0.65rem] text-slate-400 dark:text-slate-500">
                    {new Date(notif.timestamp).toLocaleDateString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
