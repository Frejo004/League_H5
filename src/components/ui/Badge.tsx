import { clsx } from 'clsx'
import { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'live'

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-surface-raised text-text-secondary border-surface-border',
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  live: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export function Badge({
  children,
  variant = 'default',
  className,
  dot,
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  )
}
