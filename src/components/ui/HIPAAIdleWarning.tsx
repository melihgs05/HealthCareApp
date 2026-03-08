/**
 * HIPAA Idle Session Warning Banner
 * ───────────────────────────────────
 * Displayed when the user has been idle for 13+ minutes.
 * Counts down to automatic logout at 15 minutes (HIPAA § 164.312(a)(2)(iii)).
 */
import { useHIPAA } from '../../context/HIPAAContext'

export function HIPAAIdleWarning() {
  const { idleSecondsLeft, resetIdle } = useHIPAA()

  if (idleSecondsLeft === null) return null

  const mins = Math.floor(idleSecondsLeft / 60)
  const secs = idleSecondsLeft % 60
  const label = mins > 0
    ? `${mins}m ${String(secs).padStart(2, '0')}s`
    : `${secs}s`

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-amber-200 dark:bg-slate-800 dark:ring-amber-700">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Expiring</p>
            <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">HIPAA auto-logout policy</p>
          </div>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 mb-4">
          You have been inactive. Your session will automatically end in{' '}
          <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{label}</span>{' '}
          to protect patient health information.
        </p>

        <button
          type="button"
          onClick={resetIdle}
          className="w-full rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-600 active:bg-amber-700 transition-colors"
        >
          I'm still here — keep me signed in
        </button>
      </div>
    </div>
  )
}
