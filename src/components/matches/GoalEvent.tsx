import { clsx } from 'clsx'

export function GoalEvent({
  side,
  playerName,
  assistName,
  minute,
  teamColor,
}: {
  side: 'home' | 'away' | 'own'
  playerName: string
  assistName?: string | null
  minute?: number | null
  teamColor: string
}) {
  if (side === 'own') {
    return (
      <div className="flex items-center justify-center gap-3 py-2.5 border-b border-surface-border/40 last:border-b-0">
        <span className="text-xs text-text-muted font-mono w-8 text-right shrink-0">
          {minute ? `${minute}'` : ''}
        </span>
        <span className="text-sm">⚽</span>
        <span className="text-xs text-text-primary font-bold">
          {playerName} (CSC)
        </span>
      </div>
    )
  }

  const isHome = side === 'home'

  return (
    <div className={clsx(
      'flex items-start gap-0 py-2.5 border-b border-surface-border/40 last:border-b-0',
    )}>
      {/* Home side */}
      <div className={clsx('flex-1 flex items-start', isHome ? 'justify-end pr-2' : '')}>
        {isHome && (
          <div className="text-right">
            <p className="text-sm font-semibold text-text-primary leading-tight">{playerName}</p>
            {assistName && (
              <p className="text-xs text-text-muted mt-0.5">
                Passe déc. <span className="text-text-secondary">{assistName}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Center — icon + minute */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-16">
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ backgroundColor: teamColor }}
          />
          <span className="text-sm leading-none">⚽</span>
        </div>
        {minute && (
          <span className="text-[10px] text-text-muted font-mono">{minute}'</span>
        )}
      </div>

      {/* Away side */}
      <div className={clsx('flex-1 flex items-start', !isHome ? 'pl-2' : 'justify-end')}>
        {!isHome && (
          <div>
            <p className="text-sm font-semibold text-text-primary leading-tight">{playerName}</p>
            {assistName && (
              <p className="text-xs text-text-muted mt-0.5">
                Passe déc. <span className="text-text-secondary">{assistName}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
