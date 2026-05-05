import { useAuth } from './useAuth'
import { usePlayers } from './usePlayers'
import { useTeams } from './useTeams'

/**
 * Hook pour récupérer l'équipe du joueur connecté
 * Retourne l'ID de l'équipe et les informations complètes de l'équipe
 */
export function useMyTeam(seasonId?: string) {
  const { profile } = useAuth()
  const { data: players } = usePlayers(seasonId)
  const { data: teams } = useTeams(seasonId)

  // Trouver le joueur correspondant au profil connecté
  const myPlayer = players?.find(p => p.user_id === profile?.id)
  
  // Trouver l'équipe du joueur
  const myTeam = teams?.find(t => t.id === myPlayer?.team_id)

  return {
    myTeamId: myPlayer?.team_id ?? null,
    myTeam: myTeam ?? null,
    myPlayer: myPlayer ?? null,
  }
}
