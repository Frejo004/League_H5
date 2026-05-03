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

const STATUS_STYLES: Record<MatchStatus, string> = {
  scheduled: 'bg-slate-700/60 text-slate-400 border border-slate-600/40',
  completed: 'bg-primary-600/20 text-primary-400 border border-primary-600/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/25',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
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

  const completedCount = filtered.filter(m => m.status === 'completed').length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="page-header">
          <Calendar className="text-primary-400" size={22} />
          <h1 className="page-title">Matchs</h1>
          {season && (
            <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30">
              {season.name}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={22} /></div>
            <p className="text-slate-400 font-medium">Aucune saison active</p>
          </div>
        </div>
      ) : !matches?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={22} /></div>
            <p className="text-slate-300 font-semibold">Aucun match programmé</p>
            <p className="text-slate-500 text-sm">Les matchs apparaîtront ici une fois ajoutés.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Matchday tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {matchdays.map(day => {
              const dayMatches = (matches ?? []).filter(m => m.matchday === day)
              const allDone = dayMatches.every(m => m.status === 'completed')
              return (
                <button
                  key={day}
                  onClick={() => setActiveMatchday(day)}
                  className={clsx(
                    'shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200',
                    currentMatchday === day
                      ? 'bg-primary-600 text-white shadow-glow-sm border border-primary-500/50'
                      : 'bg-surface-card border border-surface-border text-slate-500 hover:text-slate-200 hover:border-surface-muted'
                  )}
                >
                  J{day}
                  {allDone && currentMatchday !== day && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary-500/60 inline-block align-middle" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Matchday summary */}
          <div className="flex items-center justify-between px-1">
            <p className="section-title">Journée {currentMatchday}</p>
            <p className="text-xs text-slate-600">
              {completedCount}/{filtered.length} joués
            </p>
          </div>

          {/* Match cards */}
          <div className="space-y-3 stagger">
            {filtered.map(match => {
              const isCompleted = match.status === 'completed'
              const homeWon = isCompleted && match.home_score! > match.away_score!
              const awayWon = isCompleted && match.away_score! > match.home_score!

              return (
                <Link key={match.id} to={`/matches/${match.id}`} className="card animate-fade-in-up block hover:border-primary-600/30 transition-colors">
                  <div className="flex items-center gap-3">

                    {/* Home team */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 ring-1 ring-white/10"
                        style={{ backgroundColor: match.home_team.color || '#16a34a' }}
                      />
                      <span className={clsx(
                        'font-bold truncate text-sm',
                        homeWon ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-slate-200'
                      )}>
                        {match.home_team.name}
                      </span>
                    </div>

                    {/* Score / time */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      {isCompleted ? (
                        <div className="score-block">
                          <span className={clsx(
                            'score-display text-2xl',
                            homeWon ? 'text-primary-400' : 'text-slate-300'
                          )}>
                            {match.home_score}
                          </span>
                          <span className="text-slate-600 font-bold text-sm">–</span>
                          <span className={clsx(
                            'score-display text-2xl',
                            awayWon ? 'text-primary-400' : 'text-slate-300'
                          )}>
                            {match.away_score}
                          </span>
                        </div>
                      ) : (
                        <div className="text-center px-3 py-1.5 rounded-xl bg-black/20 border border-white/5">
                          <p className="text-slate-300 text-xs font-semibold whitespace-nowrap">
                            {match.scheduled_at ? formatDate(match.scheduled_at) : 'À définir'}
                          </p>
                        </div>
                      )}
                      <span className={clsx('badge', STATUS_STYLES[match.status])}>
                        {STATUS_LABELS[match.status]}
                      </span>
                    </div>

                    {/* Away team */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                      <span className={clsx(
                        'font-bold truncate text-sm text-right',
                        awayWon ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-slate-200'
                      )}>
                        {match.away_team.name}
                      </span>
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 ring-1 ring-white/10"
                        style={{ backgroundColor: match.away_team.color || '#334155' }}
                      />
                    </div>
                  </div>

                  {match.venue && (
                    <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                      <MapPin size={11} className="text-slate-600" />
                      <p className="text-xs text-slate-600">{match.venue}</p>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
