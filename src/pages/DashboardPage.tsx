import { LayoutDashboard, Calendar, Trophy, Target, Users } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'À définir'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
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
  const currentMatchday = matches?.length
    ? Math.max(...completedMatches.map(m => m.matchday), 0) || 1
    : null
  const topScorer = scorers?.[0]

  const stats = [
    { label: 'Matchs joués', value: completedMatches.length || '—', icon: <Calendar size={20} className="text-primary-400" /> },
    { label: 'Équipes', value: teams?.length || '—', icon: <Users size={20} className="text-primary-400" /> },
    { label: 'Meilleur buteur', value: topScorer ? `${topScorer.goals} buts` : '—', icon: <Target size={20} className="text-primary-400" /> },
    { label: 'Journée en cours', value: currentMatchday ? `J${currentMatchday}` : '—', icon: <Trophy size={20} className="text-primary-400" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="text-primary-400" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          {season && <p className="text-sm text-slate-400">{season.name}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : !season ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune saison active. Contactez l'administrateur.</p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(stat => (
              <div key={stat.label} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400 truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top scorer highlight */}
          {topScorer && (
            <div className="card bg-gradient-to-r from-primary-900/40 to-surface-card border-primary-700/40">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-600/30 border border-primary-600/50 flex items-center justify-center text-white font-bold text-lg">
                  {topScorer.first_name[0]}{topScorer.last_name[0]}
                </div>
                <div>
                  <p className="text-xs text-primary-400 font-semibold uppercase tracking-wider mb-0.5">🏆 Meilleur buteur</p>
                  <p className="text-white font-bold">{topScorer.first_name} {topScorer.last_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-slate-400">{topScorer.team_name}</span>
                    <span className="text-sm font-semibold text-primary-400">{topScorer.goals} buts</span>
                    {topScorer.assists > 0 && (
                      <span className="text-sm text-slate-400">{topScorer.assists} passes</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Next match */}
            <div className="card">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-primary-400" />
                Prochain match
              </h2>
              {upcomingMatches.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucun match programmé.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMatches.slice(0, 2).map(match => (
                      <div key={match.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: match.home_team.color }} />
                          <span className="text-white truncate">{match.home_team.name}</span>
                        </div>
                        <div className="text-center flex-shrink-0 px-2">
                          <p className="text-slate-400 text-xs">{formatDate(match.scheduled_at)}</p>
                          <p className="text-slate-500 text-xs">J{match.matchday}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span className="text-white truncate text-right">{match.away_team.name}</span>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: match.away_team.color }} />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Recent results */}
            <div className="card">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-primary-400" />
                Derniers résultats
              </h2>
              {recentMatches.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucun résultat disponible.</p>
              ) : (
                <div className="space-y-2">
                  {recentMatches.map(match => (
                      <div key={match.id} className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: match.home_team.color }} />
                          <span className={clsx(
                            'truncate',
                            match.home_score! > match.away_score! ? 'text-white font-semibold' : 'text-slate-400'
                          )}>{match.home_team.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 font-bold text-white">
                          <span>{match.home_score}</span>
                          <span className="text-slate-500 font-normal">–</span>
                          <span>{match.away_score}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <span className={clsx(
                            'truncate text-right',
                            match.away_score! > match.home_score! ? 'text-white font-semibold' : 'text-slate-400'
                          )}>{match.away_team.name}</span>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: match.away_team.color }} />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
