import { Calendar, Trophy, Target, Users, TrendingUp, Zap, ArrowRight } from 'lucide-react'
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
      color: 'from-blue-500/15 to-blue-600/5',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Équipes',
      value: teams?.length || 0,
      icon: Users,
      color: 'from-violet-500/15 to-violet-600/5',
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
    {
      label: 'Buteurs actifs',
      value: scorers?.filter(s => s.goals > 0).length || 0,
      icon: Target,
      color: 'from-orange-500/15 to-orange-600/5',
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      label: 'Journée en cours',
      value: currentMatchday ? `J${currentMatchday}` : '—',
      icon: Trophy,
      color: 'from-primary-500/15 to-primary-600/5',
      iconColor: 'text-primary-400',
      iconBg: 'bg-primary-500/10',
      border: 'border-primary-500/20',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border border-primary-500/20 border-t-primary-400/60 animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          </div>
          <p className="text-slate-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!season) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in-up">
          <div className="empty-state-icon mx-auto mb-4">
            <Trophy size={26} />
          </div>
          <p className="text-slate-300 font-semibold">Aucune saison active</p>
          <p className="text-slate-500 text-sm mt-1">Contactez l'administrateur</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="animate-fade-in-up flex items-start justify-between">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-glow-pulse inline-block" />
            {season.name}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                        bg-primary-600/10 border border-primary-600/20">
          <Zap size={12} className="text-primary-400" />
          <span className="text-xs font-bold text-primary-400 tracking-wide">LIVE</span>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        {stats.map(({ label, value, icon: Icon, color, iconColor, iconBg, border }) => (
          <div
            key={label}
            className={clsx('stat-card animate-fade-in-up bg-linear-to-br border', color, border)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={clsx('p-2 rounded-lg', iconBg, iconColor)}>
                <Icon size={17} />
              </div>
              <TrendingUp size={11} className="text-slate-700 mt-1" />
            </div>
            <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Top scorer hero ── */}
      {topScorer && (
        <div className="animate-fade-in-up relative overflow-hidden rounded-2xl pitch-bg
                        border border-primary-600/20
                        bg-linear-to-r from-primary-950/90 via-surface-card/95 to-surface-card/95 p-5">
          <div className="absolute right-0 top-0 bottom-0 w-40
                          bg-linear-to-l from-primary-600/6 to-transparent" />
          <div className="absolute right-5 top-1/2 -translate-y-1/2
                          text-8xl opacity-[0.07] select-none pointer-events-none">🏆</div>

          <div className="relative flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-primary-500 rounded-full blur-lg opacity-25" />
              <div className="relative w-14 h-14 rounded-full
                              bg-linear-to-br from-primary-400 to-primary-700
                              flex items-center justify-center text-white font-black text-lg
                              ring-2 ring-primary-500/40 shadow-glow">
                {topScorer.first_name[0]}{topScorer.last_name[0]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-0.5">
                ⚡ Meilleur buteur
              </p>
              <p className="text-white font-black text-xl leading-tight tracking-tight">
                {topScorer.first_name} {topScorer.last_name}
              </p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: topScorer.team_color }} />
                  <span className="text-sm text-slate-400">{topScorer.team_name}</span>
                </span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full
                                 bg-primary-600/20 border border-primary-600/30">
                  <span className="text-sm font-black text-primary-400">{topScorer.goals}</span>
                  <span className="text-xs text-primary-500">buts</span>
                </span>
                {topScorer.assists > 0 && (
                  <span className="text-xs text-slate-500">{topScorer.assists} passes déc.</span>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Calendar size={13} className="text-primary-400" />
              Prochain match
            </h2>
            {upcomingMatches.length > 2 && (
              <span className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-300 cursor-pointer transition-colors">
                Voir tout <ArrowRight size={11} />
              </span>
            )}
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <Calendar size={22} />
              </div>
              <p className="text-slate-500 text-sm">Aucun match programmé</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingMatches.slice(0, 2).map(match => (
                <div key={match.id}
                  className="group flex items-center gap-3 p-3 rounded-xl
                             bg-black/20 border border-white/4
                             hover:border-primary-600/25 transition-all duration-200">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-md shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: match.home_team.color }} />
                    <span className="text-white text-sm font-semibold truncate">{match.home_team.name}</span>
                  </div>
                  <div className="text-center shrink-0 px-2">
                    <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {formatDate(match.scheduled_at)}
                    </p>
                    <p className="text-[9px] text-slate-600 mt-0.5 font-bold uppercase tracking-wider">
                      J{match.matchday}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-white text-sm font-semibold truncate text-right">{match.away_team.name}</span>
                    <div className="w-6 h-6 rounded-md shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: match.away_team.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent results */}
        <div className="card animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Trophy size={13} className="text-primary-400" />
              Derniers résultats
            </h2>
          </div>

          {recentMatches.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <Trophy size={22} />
              </div>
              <p className="text-slate-500 text-sm">Aucun résultat disponible</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentMatches.map(match => {
                const homeWon = match.home_score! > match.away_score!
                const awayWon = match.away_score! > match.home_score!
                const isDraw = match.home_score === match.away_score
                return (
                  <div key={match.id}
                    className="flex items-center gap-2 px-2 py-2.5 rounded-xl
                               hover:bg-white/3 transition-colors duration-150">
                    {/* Home */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: match.home_team.color }} />
                      <span className={clsx(
                        'text-sm truncate',
                        homeWon ? 'text-white font-bold' : 'text-slate-500 font-medium'
                      )}>
                        {match.home_team.name}
                      </span>
                    </div>
                    {/* Score */}
                    <div className="score-block shrink-0">
                      <span className={clsx(
                        'font-black text-base tabular-nums leading-none',
                        homeWon ? 'text-primary-400' : isDraw ? 'text-slate-300' : 'text-slate-500'
                      )}>
                        {match.home_score}
                      </span>
                      <span className="text-slate-700 text-xs font-bold">–</span>
                      <span className={clsx(
                        'font-black text-base tabular-nums leading-none',
                        awayWon ? 'text-primary-400' : isDraw ? 'text-slate-300' : 'text-slate-500'
                      )}>
                        {match.away_score}
                      </span>
                    </div>
                    {/* Away */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className={clsx(
                        'text-sm truncate text-right',
                        awayWon ? 'text-white font-bold' : 'text-slate-500 font-medium'
                      )}>
                        {match.away_team.name}
                      </span>
                      <span className="w-2 h-2 rounded-full shrink-0"
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
