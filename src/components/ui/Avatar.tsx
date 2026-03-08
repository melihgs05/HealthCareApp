type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg'
  colorClass?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[0.6rem]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export function Avatar({ name, size = 'md', colorClass = 'bg-sky-700 text-white', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div
      className={[
        'flex flex-shrink-0 items-center justify-center rounded-full font-semibold uppercase',
        sizeClasses[size],
        colorClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
