import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import { ResultBadge } from '@/components/ui/SharedBadges'
import type { MatchWithTeams } from '@/hooks/useMatches'
import { formatTime, formatDate } from '@/components/captain/dateHelpers'

export function MatchRow({ match, teamId }: { match: MatchWithTeams; teamId: string }) {
  const isCompleted = match.status === 'completed'
  const isCancelled = match.status === 'cancelled'
  const isHome = match.home_team_id === teamId
  const oppTeam = isHome ? match.away_team : match.home_team
  const myScore = isHome ? match.home_score : match.away_score
  const oppScore = isHome ? match.away_score : match.home_score

  let result: 'W' | 'D' | 'L' | null = null
  if (isCompleted && myScore !== null && oppScore !== null) {
    result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'
  }

  return (
    <Link
      to={`/matches/${match.slug || match.id}`}
      className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-all border-b border-white/3 last:border-b-0 group"
    >
      {/* Résultat badge */}
      <div className="shrink-0">
        <ResultBadge result={result} variant="ghost" />
      </div>

      {/* Adversaire */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-black shadow-lg"
          style={{ backgroundColor: oppTeam.color }}
        >
          {oppTeam.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-text-secondary uppercase tracking-tight group-hover:text-text-primary transition-colors">
            {isHome ? 'vs' : '@'} {oppTeam.name}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-text-secondary">J{match.matchday}</span>
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin size={10} className="text-slate-600" />
                <span className="truncate max-w-20">{match.venue}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score ou date */}
      <div className="shrink-0 text-right">
        {isCompleted ? (
          <div className="flex flex-col items-end">
            <span className={clsx(
              'text-lg font-black tabular-nums tracking-tighter',
              result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-text-secondary'
            )}>
              {myScore} – {oppScore}
            </span>
          </div>
        ) : isCancelled ? (
          <span className="text-[10px] text-red-500 font-black uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">Annulé</span>
        ) : match.scheduled_at ? (
          <div className="space-y-0.5">
            <p className="text-sm font-black text-text-primary tabular-nums">{formatTime(match.scheduled_at)}</p>
            <p className="text-[9px] text-text-muted font-black uppercase tracking-widest">{formatDate(match.scheduled_at)}</p>
          </div>
        ) : (
          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">À venir</span>
        )}
      </div>
    </Link>
  )
}
