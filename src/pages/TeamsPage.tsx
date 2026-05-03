import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

export function TeamsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: teams, isLoading: teamsLoading } = useTeams(season?.id)

  const isLoading = seasonLoading || teamsLoading

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="page-header">
          <Users className="text-primary-400" size={22} />
          <h1 className="page-title">Équipes</h1>
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
            <div className="empty-state-icon"><Users size={22} /></div>
            <p className="text-slate-400 font-medium">Aucune saison active</p>
          </div>
        </div>
      ) : !teams?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={22} /></div>
            <p className="text-slate-300 font-semibold">Aucune équipe enregistrée</p>
            <p className="text-slate-500 text-sm">Les équipes apparaîtront ici une fois créées.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {teams.map(team => {
            const playerCount = (team.players as unknown as { count: number }[])?.[0]?.count ?? 0
            return (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="card-hover animate-fade-in-up group block"
              >
                {/* Color banner */}
                <div
                  className="h-1.5 rounded-full mb-4 opacity-80"
                  style={{ backgroundColor: team.color || '#16a34a' }}
                />

                <div className="flex items-center gap-4">
                  {/* Logo / color swatch */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center
                               text-white font-black text-xl shrink-0
                               ring-2 ring-white/10 shadow-lg"
                    style={{ backgroundColor: team.color || '#16a34a' }}
                  >
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name}
                        className="w-12 h-12 object-contain rounded-xl" />
                    ) : (
                      team.name[0].toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-white text-base truncate tracking-tight">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx(
                        'badge border',
                        playerCount > 0
                          ? 'bg-primary-600/15 text-primary-400 border-primary-600/25'
                          : 'bg-surface-border/50 text-slate-500 border-surface-border'
                      )}>
                        {playerCount} joueur{playerCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
