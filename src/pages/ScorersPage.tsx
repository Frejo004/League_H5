import { Target } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useScorers } from '@/hooks/useScorers'
import { useRealtimeMatches } from '@/hooks/useRealtime'
import { PageHero } from '@/components/ui/PageHero'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

export function ScorersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: scorers, isLoading: scorersLoading } = useScorers(season?.id)

  useRealtimeMatches(season?.id)

  const isLoading = seasonLoading || scorersLoading
  const topScorer = scorers?.[0]

  return (
    <div className="space-y-3">

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=1200&q=80&auto=format&fit=crop"
        pattern="hexagon"
        accentColor="#f97316"
        title="Buteurs"
        subtitle={season?.name}
        icon={<Target size={20} className="text-orange-400" />}
        stats={topScorer ? [
          { label: 'Meilleur buteur', value: `${topScorer.first_name} ${topScorer.last_name}` },
          { label: 'Buts',            value: topScorer.goals },
          { label: 'Classés',         value: scorers?.filter(s => s.goals > 0).length ?? 0 },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Target size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !scorers?.filter(s => s.goals > 0).length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Target size={20} /></div>
            <p className="text-slate-300 font-medium">Aucune statistique</p>
            <p className="text-slate-500 text-sm">Disponible après les premiers matchs.</p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden stagger-fast">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 px-4 py-2 border-b border-surface-border">
            <span className="section-title">#</span>
            <span className="section-title">Joueur</span>
            <span className="section-title text-center">Buts</span>
            <span className="section-title text-center hidden sm:block">Passes</span>
          </div>

          {scorers?.filter(s => s.goals > 0).map((row, i) => (
            <div
              key={row.player_id}
              className={clsx(
                'grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 items-center px-4 py-2.5',
                'border-b border-surface-border/50 last:border-b-0',
                'hover:bg-surface-raised transition-colors'
              )}
            >
              {/* Rank */}
              <span className={clsx(
                'text-sm font-bold tabular-nums text-center',
                i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-slate-600'
              )}>
                {i + 1}
              </span>

              {/* Player */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: row.team_color }}
                >
                  {row.first_name[0]}{row.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {row.first_name} {row.last_name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: row.team_color }} />
                    <span className="text-xs text-slate-500 truncate">{row.team_name}</span>
                  </div>
                </div>
              </div>

              {/* Goals */}
              <span className={clsx(
                'text-base font-bold tabular-nums text-center',
                i === 0 ? 'text-orange-400' : 'text-white'
              )}>
                {row.goals}
              </span>

              {/* Assists */}
              <span className="text-sm text-slate-500 tabular-nums text-center hidden sm:block">
                {row.assists || '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
