/**
 * HIPAA PHI Access Notice
 * ────────────────────────
 * HIPAA Privacy Rule § 164.526 — displayed to clinical staff before they can
 * access a PHI-containing section.  Requires explicit acknowledgement per
 * session.  The choice is stored in sessionStorage so users must re-accept
 * after every login but not on every page navigation within a session.
 */
import { useHIPAA } from '../../context/HIPAAContext'

export function HIPAANotice() {
  const { noticeAccepted, acceptNotice } = useHIPAA()

  if (noticeAccepted) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="HIPAA Compliance Notice"
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">HIPAA Compliance Notice</p>
            <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">Required before accessing protected health information</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <p>
            You are about to access <strong>Protected Health Information (PHI)</strong> governed by the
            Health Insurance Portability and Accountability Act (HIPAA).
          </p>

          <ul className="space-y-1.5 list-none">
            {[
              { icon: '🔒', text: 'Access only the minimum information necessary for your current task.' },
              { icon: '🚫', text: 'Do not share, copy, or disclose PHI to unauthorized individuals.' },
              { icon: '📋', text: 'All actions you take are recorded in a HIPAA-compliant audit log.' },
              { icon: '⏱️', text: 'Your session will automatically expire after 15 minutes of inactivity.' },
              { icon: '🔔', text: 'Report any suspected breach immediately to your compliance officer.' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                <span className="flex-shrink-0">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <p className="text-[0.65rem] text-slate-400">
            Unauthorized access or disclosure of PHI is a federal violation subject to civil and criminal penalties.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={acceptNotice}
          className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          I acknowledge and agree to handle PHI responsibly
        </button>
      </div>
    </div>
  )
}
