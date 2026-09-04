import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface SeasonRow { id: string; name: string }

export function useLandingStats() {
  return useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      const { data: season, error: seasonErr } = await supabase
        .from('seasons')
        .select('id, name')
        .eq('is_active', true)
        .maybeSingle()

      if (seasonErr) {
        console.error('[useLandingStats] Erreur lors de la récupération de la saison active:', seasonErr);
        throw seasonErr;
      }
      if (!season) return { teams: 0, players: 0, seasonName: 'Saison' };

      const seasonRow = season as SeasonRow

      const { count: teamsCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', seasonRow.id)

      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', seasonRow.id)
        .eq('is_active', true)

      return {
        teams: teamsCount ?? 0,
        players: playersCount ?? 0,
        seasonName: seasonRow.name
      }
    },
    staleTime: 1000 * 60 * 10
  })
}
