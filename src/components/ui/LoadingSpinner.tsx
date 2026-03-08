export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={['flex items-center justify-center', className].filter(Boolean).join(' ')}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600 dark:border-slate-600 dark:border-t-sky-400" />
    </div>
  )
}
