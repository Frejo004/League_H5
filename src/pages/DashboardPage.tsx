import { Calendar, Trophy, Target, Users, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'À définir'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export function DashboardPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: matches, isLoading: matchesLoading } = useMatches(season?.id)
  const { data: teams } = useTeams(season?.id)
  const { data: scorers } = useScorers(season?.id)
  const { data: standings } = useStandings(season?.id)

  const isLoading = seasonLoading || (!!season?.id && matchesLoading)

  const completedMatches = (matches ?? []).filter(m => m.status === 'completed')
  const upcomingMatches = (matches ?? [])
    .filter(m => m.status === 'scheduled' && m.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
  const recentMatches = [...completedMatches]
    .filter(m => m.played_at)
    .sort((a, b) => new Date(b.played_at!).getTime() - new Date(a.played_at!).getTime())
    .slice(0, 5)
  const topScorer = scorers?.[0]
  const topTeam = standings?.[0]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Trophy size={32} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Aucune saison active</p>
          <p className="text-slate-600 text-sm mt-1">Contactez l'administrateur</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-5xl">

      {/* Season header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">{season.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Tableau de bord</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-400
                         bg-primary-600/10 border border-primary-600/20 px-2.5 py-1 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
          En cours
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: 'Matchs joués', value: completedMatches.length, icon: Calendar, color: 'text-blue-400' },
          { label: 'Équipes',      value: teams?.length ?? 0,       icon: Users,    color: 'text-violet-400' },
          { label: 'Buteurs',      value: scorers?.filter(s => s.goals > 0).length ?? 0, icon: Target, color: 'text-orange-400' },
          { label: 'À venir',      value: upcomingMatches.length,   icon: Calendar, color: 'text-primary-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <Icon size={15} className={color} />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Next matches */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Prochains matchs</p>
            <Link to="/matches" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="empty-state py-6">
              <div className="empty-state-icon"><Calendar size={18} /></div>
              <p className="text-slate-500 text-sm">Aucun match programmé</p>
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingMatches.slice(0, 3).map(match => (
                <Link key={match.id} to={`/matches/${match.id}`}
                  className="sf-row rounded-md hover:bg-surface-raised transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: match.home_team.color }} />
                    <span className="text-sm text-slate-200 truncate font-medium">{match.home_team.name}</span>
                  </div>
                  <div className="px-3 text-center shrink-0">
                    <p className="text-xs text-slate-400 font-medium">{formatDate(match.scheduled_at)}</p>
                    <p className="text-[10px] text-slate-600 font-bold">J{match.matchday}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm text-slate-200 truncate font-medium text-right">{match.away_team.name}</span>
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: match.away_team.color }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top scorer + leader */}
        <div className="space-y-3">

          {/* Top scorer */}
          {topScorer && (
            <div className="card">
              <p className="section-title mb-3">Meilleur buteur</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center
                                text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: topScorer.team_color }}>
                  {topScorer.first_name[0]}{topScorer.last_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm truncate">
                    {topScorer.first_name} {topScorer.last_name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: topScorer.team_color }} />
                    <span className="text-xs text-slate-500 truncate">{topScorer.team_name}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-orange-400 tabular-nums">{topScorer.goals}</p>
                  <p className="text-[10px] text-slate-600">buts</p>
                </div>
              </div>
            </div>
          )}

          {/* Leader */}
          {topTeam && (
            <div className="card">
              <p className="section-title mb-3">Leader</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center
                                text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: topTeam.team_color }}>
                  {topTeam.team_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm truncate">{topTeam.team_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {topTeam.won}V · {topTeam.drawn}N · {topTeam.lost}D
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-primary-400 tabular-nums">{topTeam.points}</p>
                  <p className="text-[10px] text-slate-600">pts</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent results */}
      {recentMatches.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Derniers résultats</p>
            <Link to="/matches" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {recentMatches.map(match => {
              const homeWon = match.home_score! > match.away_score!
              const awayWon = match.away_score! > match.home_score!
              return (
                <Link key={match.id} to={`/matches/${match.id}`}
                  className="sf-row hover:bg-surface-raised transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: match.home_team.color }} />
                    <span className={clsx(
                      'text-sm truncate',
                      homeWon ? 'text-white font-semibold' : 'text-slate-500'
                    )}>
                      {match.home_team.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 shrink-0">
                    <span className={clsx('text-sm font-bold tabular-nums',
                      homeWon ? 'text-white' : 'text-slate-400')}>{match.home_score}</span>
                    <span className="text-slate-600 text-xs">–</span>
                    <span className={clsx('text-sm font-bold tabular-nums',
                      awayWon ? 'text-white' : 'text-slate-400')}>{match.away_score}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className={clsx(
                      'text-sm truncate text-right',
                      awayWon ? 'text-white font-semibold' : 'text-slate-500'
                    )}>
                      {match.away_team.name}
                    </span>
                    <span className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: match.away_team.color }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
