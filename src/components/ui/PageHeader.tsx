import { ReactNode } from 'react'
import { clsx } from 'clsx'

export function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  children,
  className,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-surface-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}
