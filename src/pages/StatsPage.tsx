import { BarChart2, Target, Star, Shield, Zap } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { useMvpRanking } from '@/hooks/useMvpVotes'
import { useMatches } from '@/hooks/useMatches'
import { PageHero } from '@/components/ui/PageHero'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

export function StatsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: scorers,  isLoading: scorersLoading  } = useScorers(season?.id)
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)
  const { data: mvpRanking, isLoading: mvpLoading } = useMvpRanking(season?.id)
  const { data: matches } = useMatches(season?.id)

  const isLoading = seasonLoading || scorersLoading || standingsLoading || mvpLoading

  // Computed stats
  const completedMatches = (matches ?? []).filter(m => m.status === 'completed')
  const totalGoals = (scorers ?? []).reduce((sum, s) => sum + s.goals, 0)
  const totalAssists = (scorers ?? []).reduce((sum, s) => sum + s.assists, 0)
  const avgGoalsPerMatch = completedMatches.length > 0
    ? (totalGoals / completedMatches.length).toFixed(1)
    : '—'

  // Best attack / best defense
  const bestAttack  = standings ? [...standings].sort((a, b) => b.goals_for - a.goals_for)[0] : null
  const bestDefense = standings ? [...standings].sort((a, b) => a.goals_against - b.goals_against)[0] : null

  // Top assisters
  const topAssisters = (scorers ?? [])
    .filter(s => s.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 5)

  // Top scorers (top 5)
  const topScorers = (scorers ?? []).filter(s => s.goals > 0).slice(0, 5)

  return (
    <div className="space-y-5">

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80&auto=format&fit=crop"
        pattern="lines"
        accentColor="#22c55e"
        title="Statistiques"
        subtitle={season?.name}
        icon={<BarChart2 size={20} className="text-green-400" />}
        stats={season ? [
          { label: 'Buts marqués',    value: totalGoals },
          { label: 'Passes déc.',     value: totalAssists },
          { label: 'Buts / match',    value: avgGoalsPerMatch },
          { label: 'Matchs joués',    value: completedMatches.length },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><BarChart2 size={22} /></div>
            <p className="text-slate-400 font-medium">Aucune saison active</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Global KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            {[
              { label: 'Matchs joués',      value: completedMatches.length, icon: Zap,    color: 'from-blue-500/15 to-blue-600/5',    iconColor: 'text-blue-400',    border: 'border-blue-500/20' },
              { label: 'Buts marqués',       value: totalGoals,              icon: Target, color: 'from-orange-500/15 to-orange-600/5', iconColor: 'text-orange-400',  border: 'border-orange-500/20' },
              { label: 'Passes décisives',   value: totalAssists,            icon: Zap,    color: 'from-violet-500/15 to-violet-600/5', iconColor: 'text-violet-400',  border: 'border-violet-500/20' },
              { label: 'Buts / match',       value: avgGoalsPerMatch,        icon: BarChart2, color: 'from-primary-500/15 to-primary-600/5', iconColor: 'text-primary-400', border: 'border-primary-500/20' },
            ].map(({ label, value, icon: Icon, color, iconColor, border }) => (
              <div key={label} className={clsx('stat-card animate-fade-in-up bg-linear-to-br border', color, border)}>
                <div className="flex items-start justify-between mb-3">
                  <div className={clsx('p-2 rounded-lg bg-black/20', iconColor)}>
                    <Icon size={17} />
                  </div>
                </div>
                <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* ── Top scorers ── */}
            <div className="card space-y-3 animate-fade-in-up">
              <h2 className="section-title flex items-center gap-2">
                <Target size={12} className="text-orange-400" />
                Top buteurs
              </h2>

              {topScorers.length === 0 ? (
                <div className="empty-state py-6">
                  <p className="text-slate-500 text-sm">Aucun but enregistré.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topScorers.map((s, i) => (
                    <div key={s.player_id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ backgroundColor: s.team_color }}
                      >
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{s.first_name} {s.last_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.team_color }} />
                          <span className="text-xs text-slate-500 truncate">{s.team_name}</span>
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-orange-400 rounded-full"
                            style={{ width: `${(s.goals / (topScorers[0]?.goals || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-black text-sm w-4 text-right">{s.goals}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Top assisters ── */}
            <div className="card space-y-3 animate-fade-in-up">
              <h2 className="section-title flex items-center gap-2">
                <Zap size={12} className="text-violet-400" />
                Top passeurs
              </h2>

              {topAssisters.length === 0 ? (
                <div className="empty-state py-6">
                  <p className="text-slate-500 text-sm">Aucune passe décisive enregistrée.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topAssisters.map((s, i) => (
                    <div key={s.player_id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ backgroundColor: s.team_color }}
                      >
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{s.first_name} {s.last_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.team_color }} />
                          <span className="text-xs text-slate-500 truncate">{s.team_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-violet-400 rounded-full"
                            style={{ width: `${(s.assists / (topAssisters[0]?.assists || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-black text-sm w-4 text-right">{s.assists}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── MVP ranking ── */}
            <div className="card space-y-3 animate-fade-in-up">
              <h2 className="section-title flex items-center gap-2">
                <Star size={12} className="text-amber-400" />
                Classement MVP
              </h2>

              {mvpLoading ? (
                <div className="empty-state py-6">
                  <p className="text-slate-500 text-sm">Chargement…</p>
                </div>
              ) : !mvpRanking?.length ? (
                <div className="empty-state py-6">
                  <div className="empty-state-icon"><Star size={18} /></div>
                  <p className="text-slate-400 font-medium">Aucun homme du match</p>
                  <p className="text-slate-600 text-xs mt-1">
                    Votez sur les pages de matchs terminés.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mvpRanking.slice(0, 5).map((m, i) => (
                    <div key={m.player_id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-600 w-5 text-right shrink-0">
                        {i === 0 ? '🏆' : i + 1}
                      </span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ backgroundColor: m.team_color }}
                      >
                        {m.first_name[0]}{m.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{m.first_name} {m.last_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.team_color }} />
                          <span className="text-xs text-slate-500 truncate">{m.team_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${(m.votes / (mvpRanking[0]?.votes || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-amber-400 font-black text-sm w-4 text-right">{m.votes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Best attack / defense ── */}
            <div className="card space-y-3 animate-fade-in-up">
              <h2 className="section-title flex items-center gap-2">
                <Shield size={12} className="text-blue-400" />
                Équipes
              </h2>

              {!standings?.length ? (
                <div className="empty-state py-6">
                  <p className="text-slate-500 text-sm">Aucune donnée disponible.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bestAttack && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Target size={14} className="text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Meilleure attaque</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bestAttack.team_color }} />
                          <p className="text-white font-bold text-sm truncate">{bestAttack.team_name}</p>
                        </div>
                      </div>
                      <span className="text-orange-400 font-black text-xl shrink-0">{bestAttack.goals_for}</span>
                    </div>
                  )}

                  {bestDefense && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Shield size={14} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Meilleure défense</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bestDefense.team_color }} />
                          <p className="text-white font-bold text-sm truncate">{bestDefense.team_name}</p>
                        </div>
                      </div>
                      <span className="text-blue-400 font-black text-xl shrink-0">{bestDefense.goals_against}</span>
                    </div>
                  )}

                  {/* Goals per team bar chart */}
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Buts marqués par équipe</p>
                    {[...standings]
                      .sort((a, b) => b.goals_for - a.goals_for)
                      .map(s => (
                        <div key={s.team_id} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.team_color }} />
                          <span className="text-xs text-slate-400 w-24 truncate shrink-0">{s.team_name}</span>
                          <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${(s.goals_for / (standings[0]?.goals_for || 1)) * 100}%`,
                                backgroundColor: s.team_color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-white font-bold w-4 text-right shrink-0">{s.goals_for}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
