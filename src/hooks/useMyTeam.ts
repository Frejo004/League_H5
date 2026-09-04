import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'

/**
 * Hook pour récupérer l'équipe du joueur connecté.
 * Fait une requête directe filtrée par user_id au lieu de charger
 * tous les joueurs de la saison.
 */
export function useMyTeam(seasonId?: string) {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: ['my-team', seasonId, profile?.id],
    enabled: !!seasonId && !!profile?.id,
    staleTime: 60_000,
    queryFn: async () => {
      // Trouver le joueur lié au profil connecté dans cette saison
      const { data: player, error: playerErr } = await supabase
        .from('players')
        .select('id, team_id, first_name, last_name, jersey_number, position, avatar_url, user_id, is_active')
        .eq('user_id', profile!.id)
        .eq('season_id', seasonId!)
        .eq('is_active', true)
        .maybeSingle()

      if (playerErr) {
        console.error('[useMyTeam] Erreur lors de la récupération du joueur:', playerErr);
        throw playerErr;
      }
      if (!player) return { myTeamId: null, myTeam: null, myPlayer: null }

      // Récupérer l'équipe
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('id, name, color, logo_url, captain_id, season_id')
        .eq('id', (player as any).team_id)
        .maybeSingle()

      if (teamErr) {
        console.error('[useMyTeam] Erreur lors de la récupération de l\'équipe:', teamErr);
        throw teamErr;
      }

      return {
        myTeamId: (player as any).team_id,
        myTeam: team ?? null,
        myPlayer: player,
      }
    },
  })

  return {
    myTeamId: query.data?.myTeamId ?? null,
    myTeam: query.data?.myTeam ?? null,
    myPlayer: query.data?.myPlayer ?? null,
    isLoading: query.isLoading,
  }
}
