/**
 * LiveBadge — Badge "🔴 LIVE" animé
 */
import { clsx } from 'clsx'

interface LiveBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LiveBadge({ size = 'md', className }: LiveBadgeProps) {
  const sizes = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-1 gap-1.5',
    lg: 'text-xs px-3 py-1.5 gap-2',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center font-black uppercase tracking-widest rounded-full',
        'bg-red-500/20 text-red-400 border border-red-500/40',
        sizes[size],
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
      LIVE
    </span>
  )
}
