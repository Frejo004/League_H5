import { Calendar, Trophy, Target, Users, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

// ── Mini match card style Sofascore ──────────────────────────────────────────
function MiniMatchCard({ match, variant }: { match: MatchWithTeams; variant: 'upcoming' | 'result' }) {
  const homeWon = match.home_score! > match.away_score!
  const awayWon = match.away_score! > match.home_score!
  const isDraw  = match.home_score === match.away_score

  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-2 px-3 py-3 hover:bg-surface-raised
                 transition-colors border-b border-surface-border/40 last:border-b-0"
    >
      {/* Home */}
      <div className="flex flex-col items-center gap-1 w-16 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: match.home_team.color }}>
          {match.home_team.logo_url
            ? <img src={match.home_team.logo_url} alt="" className="w-7 h-7 object-contain rounded-md" />
            : match.home_team.name[0]
          }
        </div>
        <span className={clsx(
          'text-[10px] font-medium text-center leading-tight truncate w-full',
          variant === 'result' ? (homeWon ? 'text-white' : 'text-slate-500') : 'text-slate-300'
        )}>
          {match.home_team.name}
        </span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center gap-0.5">
        {variant === 'result' ? (
          <>
            <div className="flex items-center gap-2">
              <span className={clsx('text-lg font-bold tabular-nums',
                homeWon ? 'text-white' : isDraw ? 'text-slate-300' : 'text-slate-500')}>
                {match.home_score}
              </span>
              <span className="text-slate-600 text-sm">-</span>
              <span className={clsx('text-lg font-bold tabular-nums',
                awayWon ? 'text-white' : isDraw ? 'text-slate-300' : 'text-slate-500')}>
                {match.away_score}
              </span>
            </div>
            <span className="text-[9px] text-primary-500 font-bold uppercase">Terminé</span>
          </>
        ) : match.scheduled_at ? (
          <>
            <span className="text-base font-bold text-white tabular-nums">
              {formatTime(match.scheduled_at)}
            </span>
            <span className="text-[10px] text-slate-500">{formatDay(match.scheduled_at)}</span>
          </>
        ) : (
          <span className="text-xs text-slate-600 font-medium">À venir</span>
        )}
      </div>

      {/* Away */}
      <div className="flex flex-col items-center gap-1 w-16 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: match.away_team.color }}>
          {match.away_team.logo_url
            ? <img src={match.away_team.logo_url} alt="" className="w-7 h-7 object-contain rounded-md" />
            : match.away_team.name[0]
          }
        </div>
        <span className={clsx(
          'text-[10px] font-medium text-center leading-tight truncate w-full',
          variant === 'result' ? (awayWon ? 'text-white' : 'text-slate-500') : 'text-slate-300'
        )}>
          {match.away_team.name}
        </span>
      </div>
    </Link>
  )
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
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => {
      // Matchs avec date en premier, triés par date
      if (a.scheduled_at && b.scheduled_at)
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      if (a.scheduled_at) return -1
      if (b.scheduled_at) return 1
      return a.matchday - b.matchday
    })
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
    <div className="space-y-3">

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
        <div className="card p-0 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
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
            <div>
              {upcomingMatches.slice(0, 3).map(match => (
                <MiniMatchCard key={match.id} match={match} variant="upcoming" />
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
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
            <p className="section-title">Derniers résultats</p>
            <Link to="/matches" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {recentMatches.map(match => (
              <MiniMatchCard key={match.id} match={match} variant="result" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
