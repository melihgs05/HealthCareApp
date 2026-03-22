import { useEffect, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  accent?: 'sky' | 'emerald'
  size?: 'sm' | 'md'
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  disabled = false,
  accent = 'sky',
  size = 'md',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const focusRing =
    accent === 'sky'
      ? 'focus:ring-sky-200 focus:border-sky-400 dark:focus:ring-sky-900/40 dark:focus:border-sky-500'
      : 'focus:ring-emerald-200 focus:border-emerald-400 dark:focus:ring-emerald-900/40 dark:focus:border-emerald-500'

  const activeRow =
    accent === 'sky'
      ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'

  const checkColor = accent === 'sky' ? 'text-sky-500' : 'text-emerald-500'
  const isSm = size === 'sm'

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
  }

  return (
    <div ref={ref} className={['relative', className].filter(Boolean).join(' ')}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 transition outline-none',
          'hover:bg-white hover:border-slate-300',
          `focus:ring-2 focus:bg-white ${focusRing}`,
          'dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:hover:border-slate-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isSm ? 'px-2 py-0.5 text-[0.65rem]' : 'px-3 py-2 text-xs',
        ].join(' ')}
      >
        <span
          className={
            selected
              ? 'text-slate-900 dark:text-slate-100'
              : 'italic text-slate-400 dark:text-slate-500'
          }
        >
          {selected?.label ?? placeholder ?? '—'}
        </span>
        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={[
            isSm ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5',
            'flex-shrink-0 transition-transform duration-200 text-slate-400',
            open ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          className={[
            'absolute left-0 z-50 mt-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50',
            'dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/60',
            isSm ? 'min-w-[9rem] max-h-52' : 'min-w-full max-h-64',
          ].join(' ')}
        >
          {/* Placeholder row */}
          {placeholder && (
            <button
              role="option"
              aria-selected={!selected}
              type="button"
              onClick={() => handleSelect('')}
              className={[
                'flex w-full items-center text-left transition-colors',
                isSm ? 'px-2.5 py-1.5 text-[0.65rem]' : 'px-3 py-2.5 text-xs',
                !selected
                  ? activeRow
                  : 'italic text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-700/60',
              ].join(' ')}
            >
              {placeholder}
            </button>
          )}

          {/* Options */}
          {options.map((opt) => {
            const isActive = opt.value === value
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isActive}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={[
                  'flex w-full items-center justify-between gap-2 text-left transition-colors',
                  isSm ? 'px-2.5 py-1.5 text-[0.65rem]' : 'px-3 py-2.5 text-xs',
                  isActive
                    ? activeRow
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60',
                ].join(' ')}
              >
                <span>{opt.label}</span>
                {isActive && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={['h-3.5 w-3.5 flex-shrink-0', checkColor].join(' ')}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
