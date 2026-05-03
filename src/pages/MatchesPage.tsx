import { useState } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches } from '@/hooks/useMatches'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { MatchStatus } from '@/types/database'
import { clsx } from 'clsx'

const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Programmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export function MatchesPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: matches, isLoading: matchesLoading } = useMatches(season?.id)
  const [activeMatchday, setActiveMatchday] = useState<number | null>(null)

  const isLoading = seasonLoading || matchesLoading
  const matchdays = [...new Set((matches ?? []).map(m => m.matchday))].sort((a, b) => a - b)
  const currentMatchday = activeMatchday ?? matchdays[0] ?? null
  const filtered = (matches ?? []).filter(m => m.matchday === currentMatchday)

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header">
          <Calendar size={18} className="text-primary-400" />
          <h1 className="page-title">Matchs</h1>
        </div>
        {season && (
          <span className="badge bg-surface-raised text-slate-400 border border-surface-border">
            {season.name}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !matches?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={20} /></div>
            <p className="text-slate-300 font-medium">Aucun match programmé</p>
          </div>
        </div>
      ) : (
        <>
          {/* Matchday tabs — style Sofascore */}
          <div className="card p-0 overflow-hidden">
            <div className="flex overflow-x-auto scrollbar-none border-b border-surface-border">
              {matchdays.map(day => (
                <button
                  key={day}
                  onClick={() => setActiveMatchday(day)}
                  className={clsx(
                    'sf-tab shrink-0',
                    currentMatchday === day && 'active'
                  )}
                >
                  J{day}
                </button>
              ))}
            </div>

            {/* Match list */}
            <div>
              {filtered.map(match => {
                const isCompleted = match.status === 'completed'
                const homeWon = isCompleted && match.home_score! > match.away_score!
                const awayWon = isCompleted && match.away_score! > match.home_score!

                return (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-surface-border/50
                               last:border-b-0 hover:bg-surface-raised transition-colors"
                  >
                    {/* Home */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: match.home_team.color }} />
                      <span className={clsx(
                        'text-sm truncate',
                        homeWon ? 'text-white font-semibold' : isCompleted ? 'text-slate-500' : 'text-slate-200'
                      )}>
                        {match.home_team.name}
                      </span>
                    </div>

                    {/* Score / time */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0 min-w-[80px]">
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className={clsx('text-base font-bold tabular-nums',
                            homeWon ? 'text-white' : 'text-slate-500')}>{match.home_score}</span>
                          <span className="text-slate-600 text-xs">–</span>
                          <span className={clsx('text-base font-bold tabular-nums',
                            awayWon ? 'text-white' : 'text-slate-500')}>{match.away_score}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium text-center">
                          {match.scheduled_at ? formatDate(match.scheduled_at) : 'À définir'}
                        </span>
                      )}
                      <span className={clsx(
                        'text-[9px] font-bold uppercase tracking-wide',
                        match.status === 'completed' ? 'text-primary-500' :
                        match.status === 'cancelled'  ? 'text-red-500' : 'text-slate-600'
                      )}>
                        {STATUS_LABELS[match.status]}
                      </span>
                    </div>

                    {/* Away */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className={clsx(
                        'text-sm truncate text-right',
                        awayWon ? 'text-white font-semibold' : isCompleted ? 'text-slate-500' : 'text-slate-200'
                      )}>
                        {match.away_team.name}
                      </span>
                      <span className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: match.away_team.color }} />
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Venue info if any */}
            {filtered.some(m => m.venue) && (
              <div className="px-4 py-2 border-t border-surface-border/50">
                {filtered.filter(m => m.venue).map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin size={10} />
                    {m.venue}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
