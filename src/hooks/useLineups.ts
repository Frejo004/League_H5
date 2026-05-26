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
      // 1. Récupérer les numéros de maillot des joueurs concernés
      const allPlayerIds = [
        ...starters.map(s => typeof s === 'string' ? s : s.id),
        ...substitutes,
      ]
      const { data: playersData } = await supabase
        .from('players')
        .select('id, jersey_number')
        .in('id', allPlayerIds)
      const jerseyMap = new Map<string, number | null>(
        (playersData ?? []).map(p => [p.id, p.jersey_number])
      )

      // 2. Supprimer l'ancienne compo pour cette équipe
      // NOTE: Cette opération n'est pas atomique. Si l'insertion échoue après cette suppression,
      // la composition sera temporairement vide. Pour une atomicité complète,
      // il est recommandé de déplacer cette logique vers une fonction Supabase (RPC).
      await supabase
        .from('match_lineups')
        .delete()
        .eq('match_id', matchId)
        .eq('team_id', teamId)

      // 3. Préparer les nouveaux records avec jersey_number
      const entries = [
        ...starters.map(s => {
          const pid = typeof s === 'string' ? s : s.id
          const pos = typeof s === 'string' ? null : s.pos
          return {
            match_id: matchId,
            team_id: teamId,
            player_id: pid,
            is_starter: true,
            position: pos,
            jersey_number: jerseyMap.get(pid) ?? null,
          }
        }),
        ...substitutes.map(pid => ({
          match_id: matchId,
          team_id: teamId,
          player_id: pid,
          is_starter: false,
          position: null,
          jersey_number: jerseyMap.get(pid) ?? null,
        }))
      ]

      if (entries.length === 0) return

      // 4. Insérer
      const { error } = await supabase.from('match_lineups').insert(entries)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['match_lineups', variables.matchId] })
    }
  })
}
