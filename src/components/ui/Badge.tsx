type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
  error: 'bg-rose-50 text-rose-800 ring-1 ring-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800',
  info: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',
  neutral: 'bg-slate-50 text-slate-700 ring-1 ring-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600',
}

type BadgeProps = {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-1 text-[0.65rem] font-medium',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
