/**
 * LiveClock — Chronomètre live avec barre de progression
 * Durée : 20min (1ère MT) + 5min pause + 20min (2ème MT) = 45min
 */
import { clsx } from 'clsx'
import { useLiveClock, HALF_DURATION, BREAK_DURATION, TOTAL_DURATION } from '@/hooks/useMatchLive'

interface LiveClockProps {
  liveStartedAt: string | null
  livePeriod: 1 | 2 | null
  status: string
  homeColor: string
  awayColor: string
  className?: string
}

export function LiveClock({
  liveStartedAt, livePeriod, status, homeColor, awayColor, className,
}: LiveClockProps) {
  const clock = useLiveClock(liveStartedAt, livePeriod, status)

  const isLive = status === 'live'
  const isCompleted = status === 'completed'

  // Segments de la barre : 1ère MT | pause | 2ème MT
  const seg1 = (HALF_DURATION / TOTAL_DURATION) * 100   // ~44.4%
  const seg2 = (BREAK_DURATION / TOTAL_DURATION) * 100  // ~11.1%
  // seg3 = reste

  return (
    <div className={clsx('flex flex-col items-center gap-2', className)}>
      {/* Affichage minute */}
      <div className="flex items-center gap-2">
        {isLive && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        )}
        <span className={clsx(
          'font-black tabular-nums',
          isLive ? 'text-2xl text-white' : 'text-lg text-slate-400',
        )}>
          {isCompleted ? 'FT' : isLive ? clock.label : '—'}
        </span>
        {isLive && (
          <span className="text-xs text-slate-500 font-medium">
            {livePeriod === 1 ? '1ère MT' : '2ème MT'}
          </span>
        )}
      </div>

      {/* Barre de progression segmentée */}
      {(isLive || isCompleted) && (
        <div className="w-full max-w-xs flex items-center gap-0.5 h-1.5">
          {/* Segment 1ère MT */}
          <div
            className="relative h-full rounded-l-full overflow-hidden bg-white/10"
            style={{ width: `${seg1}%` }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-1000"
              style={{
                width: isCompleted || livePeriod === 2
                  ? '100%'
                  : `${Math.min((clock.minute / HALF_DURATION) * 100, 100)}%`,
                backgroundColor: homeColor,
              }}
            />
          </div>

          {/* Séparateur pause */}
          <div
            className="h-full bg-white/10 rounded-sm overflow-hidden"
            style={{ width: `${seg2}%` }}
          >
            {(isCompleted || livePeriod === 2) && (
              <div className="h-full bg-slate-500 w-full" />
            )}
          </div>

          {/* Segment 2ème MT */}
          <div
            className="relative h-full rounded-r-full overflow-hidden bg-white/10 flex-1"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-r-full transition-all duration-1000"
              style={{
                width: isCompleted
                  ? '100%'
                  : livePeriod === 2
                  ? `${Math.min((clock.minute / HALF_DURATION) * 100, 100)}%`
                  : '0%',
                backgroundColor: awayColor,
              }}
            />
          </div>
        </div>
      )}

      {/* Labels segments */}
      {(isLive || isCompleted) && (
        <div className="w-full max-w-xs flex justify-between text-[9px] text-slate-700 font-medium">
          <span>0'</span>
          <span>{HALF_DURATION}'</span>
          <span>{HALF_DURATION + BREAK_DURATION}'</span>
          <span>{HALF_DURATION * 2 + BREAK_DURATION}'</span>
        </div>
      )}
    </div>
  )
}
