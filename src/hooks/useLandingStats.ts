import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useLandingStats() {
  return useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      // 1. Get active season
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

      // 2. Count teams
      const { count: teamsCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', (season as any).id)

      // 3. Count players
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', (season as any).id)
        .eq('is_active', true)

      return {
        teams: teamsCount ?? 0,
        players: playersCount ?? 0,
        seasonName: (season as any).name
      }
    },
    staleTime: 1000 * 60 * 10 // 10 minutes
  })
}
