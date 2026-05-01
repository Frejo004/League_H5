import { Calendar, Trophy, Target, Users, TrendingUp, Zap } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { clsx } from 'clsx'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'À définir'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export function DashboardPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: matches, isLoading: matchesLoading } = useMatches(season?.id)
  const { data: teams } = useTeams(season?.id)
  const { data: scorers } = useScorers(season?.id)

  const isLoading = seasonLoading || matchesLoading

  const completedMatches = (matches ?? []).filter(m => m.status === 'completed')
  const upcomingMatches = (matches ?? [])
    .filter(m => m.status === 'scheduled' && m.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
  const recentMatches = [...completedMatches]
    .sort((a, b) => new Date(b.played_at ?? b.updated_at).getTime() - new Date(a.played_at ?? a.updated_at).getTime())
    .slice(0, 5)
  const currentMatchday = completedMatches.length
    ? Math.max(...completedMatches.map(m => m.matchday))
    : null
  const topScorer = scorers?.[0]

  const stats = [
    {
      label: 'Matchs joués',
      value: completedMatches.length || 0,
      icon: Calendar,
      color: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-400',
      border: 'border-blue-500/20',
    },
    {
      label: 'Équipes',
      value: teams?.length || 0,
      icon: Users,
      color: 'from-violet-500/20 to-violet-600/10',
      iconColor: 'text-violet-400',
      border: 'border-violet-500/20',
    },
    {
      label: 'Buteurs actifs',
      value: scorers?.filter(s => s.goals > 0).length || 0,
      icon: Target,
      color: 'from-orange-500/20 to-orange-600/10',
      iconColor: 'text-orange-400',
      border: 'border-orange-500/20',
    },
    {
      label: 'Journée en cours',
      value: currentMatchday ? `J${currentMatchday}` : '—',
      icon: Trophy,
      color: 'from-primary-500/20 to-primary-600/10',
      iconColor: 'text-primary-400',
      border: 'border-primary-500/20',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border border-primary-500/20 border-t-primary-400/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          </div>
          <p className="text-slate-400 text-sm animate-pulse">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!season) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-slate-500" />
          </div>
          <p className="text-slate-300 font-medium">Aucune saison active</p>
          <p className="text-slate-500 text-sm mt-1">Contactez l'administrateur</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-glow-pulse inline-block" />
              {season.name}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-600/10 border border-primary-600/20">
            <Zap size={13} className="text-primary-400" />
            <span className="text-xs font-semibold text-primary-400">En direct</span>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        {stats.map(({ label, value, icon: Icon, color, iconColor, border }) => (
          <div
            key={label}
            className={clsx(
              'stat-card animate-fade-in-up',
              `bg-gradient-to-br ${color}`,
              `border ${border}`
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={clsx('p-2 rounded-lg bg-white/5', iconColor)}>
                <Icon size={18} />
              </div>
              <TrendingUp size={12} className="text-slate-600 mt-1" />
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Top scorer hero ── */}
      {topScorer && (
        <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-primary-600/25
                        bg-gradient-to-r from-primary-950/80 via-surface-card to-surface-card p-5">
          {/* Background decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-primary-600/8 to-transparent" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none">🏆</div>

          <div className="relative flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-primary-500 rounded-full blur-md opacity-30" />
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700
                              flex items-center justify-center text-white font-bold text-lg
                              ring-2 ring-primary-500/30 shadow-glow">
                {topScorer.first_name[0]}{topScorer.last_name[0]}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-0.5">
                ⚡ Meilleur buteur
              </p>
              <p className="text-white font-bold text-lg leading-tight">
                {topScorer.first_name} {topScorer.last_name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: topScorer.team_color }} />
                  <span className="text-sm text-slate-400">{topScorer.team_name}</span>
                </span>
                <span className="text-sm font-bold text-primary-400">{topScorer.goals} buts</span>
                {topScorer.assists > 0 && (
                  <span className="text-sm text-slate-500">{topScorer.assists} passes</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Next match + Recent results ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Next match */}
        <div className="card animate-fade-in-up">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Calendar size={14} className="text-primary-400" />
            Prochain match
          </h2>
          {upcomingMatches.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Calendar size={28} className="text-slate-700 mb-2" />
              <p className="text-slate-500 text-sm">Aucun match programmé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.slice(0, 2).map(match => (
                <div key={match.id}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-surface/60
                             border border-surface-border/40 hover:border-primary-600/30
                             transition-all duration-200">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: match.home_team.color }} />
                    <span className="text-white text-sm font-medium truncate">{match.home_team.name}</span>
                  </div>
                  <div className="text-center flex-shrink-0 px-2">
                    <p className="text-[10px] text-slate-400 font-medium">{formatDate(match.scheduled_at)}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">J{match.matchday}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-white text-sm font-medium truncate text-right">{match.away_team.name}</span>
                    <div className="w-6 h-6 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: match.away_team.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent results */}
        <div className="card animate-fade-in-up">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Trophy size={14} className="text-primary-400" />
            Derniers résultats
          </h2>
          {recentMatches.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Trophy size={28} className="text-slate-700 mb-2" />
              <p className="text-slate-500 text-sm">Aucun résultat disponible</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentMatches.map(match => {
                const homeWon = match.home_score! > match.away_score!
                const awayWon = match.away_score! > match.home_score!
                return (
                  <div key={match.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl
                               hover:bg-white/3 transition-colors duration-150 text-sm">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: match.home_team.color }} />
                      <span className={clsx('truncate', homeWon ? 'text-white font-semibold' : 'text-slate-500')}>
                        {match.home_team.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 font-bold">
                      <span className={homeWon ? 'text-primary-400' : 'text-slate-300'}>{match.home_score}</span>
                      <span className="text-slate-600 font-normal text-xs">–</span>
                      <span className={awayWon ? 'text-primary-400' : 'text-slate-300'}>{match.away_score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className={clsx('truncate text-right', awayWon ? 'text-white font-semibold' : 'text-slate-500')}>
                        {match.away_team.name}
                      </span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: match.away_team.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
