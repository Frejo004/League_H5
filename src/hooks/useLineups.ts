import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatchLineupRow } from '@/types/database'

export type MatchLineup = MatchLineupRow & {
  player: {
    first_name: string
    last_name: string
    jersey_number: number | null
    position: string | null
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
          player:players(first_name, last_name, jersey_number, position)
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
      // 1. Supprimer l'ancienne compo pour cette équipe
      await supabase
        .from('match_lineups')
        .delete()
        .eq('match_id', matchId)
        .eq('team_id', teamId)

      // 2. Préparer les nouveaux records
      const entries = [
        ...starters.map(s => {
          const pid = typeof s === 'string' ? s : s.id
          const pos = typeof s === 'string' ? null : s.pos
          return {
            match_id: matchId,
            team_id: teamId,
            player_id: pid,
            is_starter: true,
            position: pos
          }
        }),
        ...substitutes.map(pid => ({
          match_id: matchId,
          team_id: teamId,
          player_id: pid,
          is_starter: false,
          position: null
        }))
      ]

      if (entries.length === 0) return

      // 3. Insérer
      const { error } = await supabase.from('match_lineups').insert(entries)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['match_lineups', variables.matchId] })
    }
  })
}
