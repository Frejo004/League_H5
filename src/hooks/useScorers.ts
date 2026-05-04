import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ScorerRow {
  player_id: string
  first_name: string
  last_name: string
  team_id: string
  team_name: string
  team_color: string
  goals: number
  assists: number
  own_goals: number
}

export function useScorers(seasonId?: string) {
  return useQuery({
    queryKey: ['scorers', seasonId],
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 10, // 10 min — ne change qu'après une mise à jour de match
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scorers', {
        p_season_id: seasonId!,
      })
      if (error) throw error
      return (data ?? []) as ScorerRow[]
    },
  })
}
