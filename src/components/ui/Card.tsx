import { clsx } from 'clsx'
import { ReactNode } from 'react'

export function Card({
  children,
  className,
  hover,
  featured,
  ...props
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  featured?: boolean
  [key: string]: unknown
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border transition-all duration-200',
        featured
          ? 'border-primary-500/50 bg-surface-card shadow-glow'
          : 'border-surface-border bg-surface-card',
        hover && 'hover:border-surface-muted hover:bg-surface-raised hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
