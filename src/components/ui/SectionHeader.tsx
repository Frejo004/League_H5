import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

export function SectionHeader({
  title,
  href,
  actionLabel,
  onAction,
  className,
}: {
  title: string
  href?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between px-4 py-3',
        className
      )}
      style={{ borderBottom: '1px solid var(--color-surface-border)' }}
    >
      <span
        className="text-[11px] font-black uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {title}
      </span>
      {href ? (
        <Link
          to={href}
          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors font-semibold"
        >
          {actionLabel ?? 'Tout voir'}
          <ChevronRight size={11} />
        </Link>
      ) : actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors font-semibold"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
