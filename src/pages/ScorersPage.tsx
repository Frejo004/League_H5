import { Target } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useScorers } from '@/hooks/useScorers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

export function ScorersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: scorers, isLoading: scorersLoading } = useScorers(season?.id)

  const isLoading = seasonLoading || scorersLoading
  const maxGoals = scorers?.[0]?.goals ?? 1

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="page-header">
          <Target className="text-primary-400" size={22} />
          <h1 className="page-title">Buteurs & Passeurs</h1>
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
            <div className="empty-state-icon"><Target size={22} /></div>
            <p className="text-slate-400 font-medium">Aucune saison active</p>
          </div>
        </div>
      ) : !scorers?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Target size={22} /></div>
            <p className="text-slate-300 font-semibold">Aucune statistique</p>
            <p className="text-slate-500 text-sm">Les stats apparaîtront après les premiers matchs.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {scorers.map((row, i) => {
            const isTop3 = i < 3
            const barWidth = Math.round((row.goals / maxGoals) * 100)

            return (
              <div
                key={row.player_id}
                className={clsx(
                  'animate-fade-in-up relative overflow-hidden rounded-2xl border p-4 transition-all duration-200',
                  i === 0
                    ? 'bg-linear-to-r from-yellow-500/8 via-surface-card to-surface-card border-yellow-500/20'
                    : i === 1
                    ? 'bg-linear-to-r from-slate-400/5 via-surface-card to-surface-card border-slate-500/15'
                    : i === 2
                    ? 'bg-linear-to-r from-amber-500/6 via-surface-card to-surface-card border-amber-500/15'
                    : 'bg-surface-card border-surface-border hover:border-surface-muted'
                )}
              >
                {/* Progress bar background */}
                <div
                  className={clsx(
                    'absolute left-0 top-0 bottom-0 opacity-[0.04] transition-all duration-700',
                    i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-amber-500' : 'bg-primary-500'
                  )}
                  style={{ width: `${barWidth}%` }}
                />

                <div className="relative flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-7 shrink-0 text-center">
                    {i === 0 ? (
                      <span className="text-lg">🥇</span>
                    ) : i === 1 ? (
                      <span className="text-lg">🥈</span>
                    ) : i === 2 ? (
                      <span className="text-lg">🥉</span>
                    ) : (
                      <span className="text-sm font-bold text-slate-600">{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ring-2',
                    i === 0 ? 'bg-linear-to-br from-yellow-500 to-amber-600 ring-yellow-500/30' :
                    i === 1 ? 'bg-linear-to-br from-slate-400 to-slate-600 ring-slate-400/20' :
                    i === 2 ? 'bg-linear-to-br from-amber-500 to-orange-600 ring-amber-500/20' :
                    'bg-linear-to-br from-primary-600 to-primary-800 ring-primary-600/20'
                  )}>
                    {row.first_name[0]}{row.last_name[0]}
                  </div>

                  {/* Name + team */}
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      'font-bold truncate',
                      isTop3 ? 'text-white' : 'text-slate-200'
                    )}>
                      {row.first_name} {row.last_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: row.team_color || '#16a34a' }}
                      />
                      <span className="text-xs text-slate-500 truncate">{row.team_name}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className={clsx(
                        'font-black text-2xl leading-none tabular-nums',
                        i === 0 ? 'rank-gold text-glow-gold' :
                        i === 1 ? 'rank-silver' :
                        i === 2 ? 'rank-bronze' :
                        'text-white'
                      )}>
                        {row.goals}
                      </p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">buts</p>
                    </div>
                    {row.assists > 0 && (
                      <div className="text-center hidden sm:block">
                        <p className="font-bold text-lg leading-none tabular-nums text-slate-400">{row.assists}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">passes</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom progress bar */}
                {isTop3 && (
                  <div className="relative mt-3 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-1000',
                        i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-400' : 'bg-amber-500'
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
