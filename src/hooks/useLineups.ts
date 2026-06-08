import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatchLineupRow } from '@/types/database'

export type MatchLineup = MatchLineupRow & {
  player: {
    first_name: string
    last_name: string
    jersey_number: number | null
    position: string | null
    user_id: string | null
    avatar_url: string | null
  } | null
}

export function useMatchLineups(matchId?: string) {
  return useQuery({
    queryKey: ['match_lineups', matchId],
    queryFn: async () => {
      if (!matchId) return []
      const { data, error } = await supabase
        .from('match_lineups')
        .select(`
          *,
          player:players(first_name, last_name, jersey_number, position, user_id, avatar_url)
        `)
        .eq('match_id', matchId)
      
      if (error) {
        console.error('Error fetching lineups:', error)
        return []
      }
      return data as MatchLineup[]
    },
    enabled: !!matchId,
  })
}

export function useUpdateMatchLineup() {
  const qc = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      matchId, 
      teamId, 
      starters, 
      substitutes 
    }: { 
      matchId: string, 
      teamId: string, 
      starters: string[] | { id: string, pos: string }[], 
      substitutes: string[] 
    }) => {
      // Préparer les données pour le RPC
      const players = [
        ...starters.map(s => {
          const pid = typeof s === 'string' ? s : s.id
          const pos = typeof s === 'string' ? null : s.pos
          return { player_id: pid, is_starter: true, position: pos }
        }),
        ...substitutes.map(pid => ({ player_id: pid, is_starter: false, position: null }))
      ]

      if (players.length === 0) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.rpc('update_match_lineup' as any, {
        p_match_id: matchId,
        p_team_id: teamId,
        p_players: players
      })
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['match_lineups', variables.matchId] })
    }
  })
}
