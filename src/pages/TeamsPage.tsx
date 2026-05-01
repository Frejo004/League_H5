import { Users } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function TeamsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: teams, isLoading: teamsLoading } = useTeams(season?.id)

  const isLoading = seasonLoading || teamsLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Équipes</h1>
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
      ) : !teams?.length ? (
        <div className="card text-center py-12">
          <Users size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">Aucune équipe enregistrée pour cette saison.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => {
            const playerCount = (team.players as unknown as { count: number }[])?.[0]?.count ?? 0
            return (
              <div key={team.id} className="card hover:border-primary-600/40 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Color swatch / logo */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: team.color || '#16a34a' }}
                  >
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-10 h-10 object-contain rounded-lg" />
                    ) : (
                      team.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{team.name}</h3>
                    <p className="text-sm text-slate-400">
                      {playerCount} joueur{playerCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
