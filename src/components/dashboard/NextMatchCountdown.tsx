import { useState, useEffect, useMemo } from 'react'
import { Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMatchLineups } from '@/hooks/useLineups'
import type { MatchWithTeams } from '@/hooks/useMatches'

// ── Statut composition pour un match ─────────────────────────────────────────
export function LineupStatusBadge({ matchId, teamId, isCaptain }: {
  matchId: string; teamId: string; isCaptain: boolean
}) {
  const { data: lineups, isLoading } = useMatchLineups(matchId)
  const hasLineup = useMemo(() => {
    if (!lineups) return false
    return lineups.some(l => l.team_id === teamId && l.is_starter)
  }, [lineups, teamId])

  if (isLoading) return null
  if (hasLineup) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
        <CheckCircle2 size={11} className="text-green-400 shrink-0" />
        <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Compo soumise</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertCircle size={11} className="text-amber-400 shrink-0" />
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Compo manquante</span>
      </div>
      {isCaptain && (
        <Link to="/captain" onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-500/15 border border-primary-500/30 text-[10px] font-black text-primary-400 hover:bg-primary-500/25 transition-colors uppercase tracking-wider">
          Soumettre <ChevronRight size={10} />
        </Link>
      )}
    </div>
  )
}

// ── Compte à rebours ──────────────────────────────────────────────────────────
export function useCountdown(targetDate: string | null) {
  const [diff, setDiff] = useState<number | null>(null)
  useEffect(() => {
    if (!targetDate) return
    const tick = () => setDiff(new Date(targetDate).getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  if (diff === null || diff <= 0) return null
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  if (h > 48) return null
  return { h, m, s }
}

export function NextMatchCountdown({ match, teamId, isCaptain }: {
  match: MatchWithTeams; teamId?: string | null; isCaptain?: boolean
}) {
  const countdown = useCountdown(match.scheduled_at)
  const isImminent = countdown ? countdown.h === 0 && countdown.m < 30 : false
  return (
    <div className={clsx('mx-4 mb-3 rounded-xl border overflow-hidden',
      isImminent ? 'border-red-500/30' : 'border-primary-500/20')}>
      {countdown && (
        <div className={clsx('flex items-center justify-center gap-3 px-4 py-2.5',
          isImminent ? 'bg-red-500/8' : 'bg-primary-500/5')}>
          <Clock size={13} className={isImminent ? 'text-red-400' : 'text-primary-400'} />
          <span className={clsx('text-[10px] font-black uppercase tracking-widest',
            isImminent ? 'text-red-300' : 'text-primary-300')}>
            Prochain match dans
          </span>
          <div className={clsx('flex items-center gap-1 font-black tabular-nums', isImminent && 'animate-pulse')}>
            {countdown.h > 0 && (<>
              <span className={clsx('text-lg', isImminent ? 'text-red-400' : 'text-text-primary')}>{String(countdown.h).padStart(2, '0')}</span>
              <span className="text-text-muted text-sm">h</span>
            </>)}
            <span className={clsx('text-lg', isImminent ? 'text-red-400' : 'text-text-primary')}>{String(countdown.m).padStart(2, '0')}</span>
            <span className="text-text-muted text-sm">m</span>
            <span className={clsx('text-lg', isImminent ? 'text-red-400' : 'text-text-primary')}>{String(countdown.s).padStart(2, '0')}</span>
            <span className="text-text-muted text-sm">s</span>
          </div>
        </div>
      )}
      {teamId && (
        <div className={clsx('flex items-center justify-between gap-2 px-4 py-2 border-t',
          isImminent ? 'border-red-500/15 bg-red-500/4' : 'border-primary-500/10 bg-black/20')}>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Composition</span>
          <LineupStatusBadge matchId={match.id} teamId={teamId} isCaptain={!!isCaptain} />
        </div>
      )}
    </div>
  )
}
