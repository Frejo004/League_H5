import { useState } from 'react'
import { Calendar } from 'lucide-react'
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
  scheduled: 'bg-slate-700 text-slate-300',
  completed: 'bg-primary-600/20 text-primary-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export function MatchesPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: matches, isLoading: matchesLoading } = useMatches(season?.id)
  const [activeMatchday, setActiveMatchday] = useState<number | null>(null)

  const isLoading = seasonLoading || matchesLoading

  // Group by matchday
  const matchdays = [...new Set((matches ?? []).map(m => m.matchday))].sort((a, b) => a - b)
  const currentMatchday = activeMatchday ?? matchdays[0] ?? null
  const filtered = (matches ?? []).filter(m => m.matchday === currentMatchday)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Matchs</h1>
        {season && (
          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30">
            {season.name}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : !season ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune saison active.</p>
        </div>
      ) : !matches?.length ? (
        <div className="card text-center py-12">
          <Calendar size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">Aucun match programmé pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Matchday tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {matchdays.map(day => (
              <button
                key={day}
                onClick={() => setActiveMatchday(day)}
                className={clsx(
                  'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  currentMatchday === day
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-card border border-surface-border text-slate-400 hover:text-slate-200'
                )}
              >
                J{day}
              </button>
            ))}
          </div>

          {/* Match cards */}
          <div className="space-y-3">
            {filtered.map(match => {
              const home = match.home_team as unknown as { id: string; name: string; color: string }
              const away = match.away_team as unknown as { id: string; name: string; color: string }
              const isCompleted = match.status === 'completed'

              return (
                <div key={match.id} className="card">
                  <div className="flex items-center justify-between gap-4">
                    {/* Home team */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: home?.color || '#16a34a' }}
                      />
                      <span className="font-medium text-white truncate">{home?.name}</span>
                    </div>

                    {/* Score / time */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {isCompleted ? (
                        <div className="flex items-center gap-2 text-xl font-bold text-white">
                          <span>{match.home_score}</span>
                          <span className="text-slate-500">–</span>
                          <span>{match.away_score}</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm font-medium">
                          {match.scheduled_at ? formatDate(match.scheduled_at) : 'À définir'}
                        </div>
                      )}
                      <span className={clsx('badge text-xs', STATUS_STYLES[match.status])}>
                        {STATUS_LABELS[match.status]}
                      </span>
                    </div>

                    {/* Away team */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                      <span className="font-medium text-white truncate text-right">{away?.name}</span>
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: away?.color || '#334155' }}
                      />
                    </div>
                  </div>

                  {match.venue && (
                    <p className="text-xs text-slate-500 mt-2 text-center">📍 {match.venue}</p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
