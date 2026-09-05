import { ReactNode } from 'react'
import { clsx } from 'clsx'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-10 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-surface-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
        {title}
      </p>
      {description && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
