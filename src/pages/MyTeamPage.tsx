import { Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { usePlayers } from '@/hooks/usePlayers'
import { TeamView } from '@/pages/CaptainPage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function MyTeamPage() {
  const { profile } = useAuth()
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: allPlayers, isLoading: playersLoading } = usePlayers(season?.id)
  const { data: teams, isLoading: teamsLoading } = useTeams(season?.id)

  const isLoading = seasonLoading || playersLoading || teamsLoading

  // Trouve le player lié au compte connecté
  const myPlayer = (allPlayers ?? []).find(p => p.user_id === profile?.id)

  // Trouve l'équipe du joueur
  const myTeam = myPlayer
    ? (teams ?? []).find(t => t.id === myPlayer.team_id)
    : undefined

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Users size={18} className="text-blue-400" />
        <h1 className="page-title">Mon Équipe</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state py-8">
            <p className="text-slate-400 text-sm">Aucune saison active.</p>
          </div>
        </div>
      ) : !myTeam ? (
        <div className="card">
          <div className="empty-state py-8">
            <Users size={28} className="text-slate-600 mb-2" />
            <p className="text-slate-300 font-medium">Aucune équipe trouvée</p>
            <p className="text-slate-500 text-sm mt-1">
              Tu n'es pas encore assigné à une équipe cette saison.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Team info card */}
          <div className="card flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: myTeam.color ?? '#16a34a' }}
            >
              {myTeam.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{myTeam.name}</p>
              <p className="text-xs text-slate-500">{season.name}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: myTeam.color ?? '#16a34a' }}
              />
              <span className="text-xs text-slate-400 font-medium">Joueur</span>
            </div>
          </div>

          {/* Onglets en lecture seule */}
          <TeamView
            teamId={myTeam.id}
            teamColor={myTeam.color ?? '#16a34a'}
            seasonId={season.id}
            readonly
          />
        </>
      )}
    </div>
  )
}
