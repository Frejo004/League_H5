import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Player, Database } from '@/types/database'

export function usePlayers(seasonId?: string) {
  return useQuery({
    queryKey: ['players', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      // Requête séparée pour éviter les problèmes de FK imbriquée
      const { data: players, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .eq('season_id', seasonId!)
        .eq('is_active', true)
        .order('last_name')
      if (playersErr) throw playersErr

      if (!players?.length) return []

      // Fetch les équipes séparément
      const teamIds = [...new Set(players.map(p => p.team_id))]
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, color')
        .in('id', teamIds)

      const teamsMap = new Map((teams ?? []).map(t => [t.id, t]))

      return players.map(p => ({
        ...p,
        teams: teamsMap.get(p.team_id) ?? null,
      }))
    },
  })
}

export function usePlayersByTeam(teamId?: string) {
  return useQuery({
    queryKey: ['players', 'team', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId!)
        .eq('is_active', true)
        .order('jersey_number')
      if (error) throw error
      return data as Player[]
    },
  })
}

export function useCreatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      team_id: string
      season_id: string
      first_name: string
      last_name: string
      jersey_number?: number | null
      position?: Player['position']
      user_id?: string | null
    }) => {
      const { data, error } = await supabase.from('players').insert(values).select().single()
      if (error) throw error
      return data as Player
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['players', variables.season_id] })
      qc.invalidateQueries({ queryKey: ['players', 'team', variables.team_id] })
    },
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Database['public']['Tables']['players']['Update']) => {
      const { data, error } = await supabase
        .from('players')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Player
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['players', data.season_id] })
      qc.invalidateQueries({ queryKey: ['players', 'team', data.team_id] })
    },
  })
}

export function useDeactivatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('players').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  })
}
