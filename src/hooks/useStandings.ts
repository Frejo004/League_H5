import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface StandingRow {
  team_id: string
  team_name: string
  team_color: string
  team_logo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
  position_change?: number
  form: Array<'W' | 'D' | 'L'>
}

export function useStandings(seasonId?: string) {
  return useQuery({
    queryKey: ['standings', seasonId],
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 10, // 10 min — ne change qu'après une mise à jour de match
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_standings', {
        p_season_id: seasonId!,
      })
      if (error) throw error

      return (data ?? []).map(row => ({
        ...row,
        team_logo: row.team_logo ?? null,
        // Parse 'W,D,L,W,W' → ['W','D','L','W','W']
        form: row.form
          ? (row.form.split(',') as Array<'W' | 'D' | 'L'>)
          : [],
      })) as StandingRow[]
    },
  })
}
