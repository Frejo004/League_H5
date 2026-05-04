import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Player, Database } from '@/types/database'

export function usePlayers(seasonId?: string) {
  return useQuery({
    queryKey: ['players', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data: players, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .eq('season_id', seasonId!)
        .eq('is_active', true)
        .order('last_name')
      if (playersErr) throw playersErr

      if (!players?.length) return []

      // Fetch équipes + profils liés en parallèle
      const teamIds   = [...new Set(players.map(p => p.team_id))]
      const userIds   = players.map(p => p.user_id).filter(Boolean) as string[]

      const [teamsRes, profilesRes] = await Promise.all([
        supabase.from('teams').select('id, name, color').in('id', teamIds),
        userIds.length
          ? supabase.from('profiles').select('id, avatar_url').in('id', userIds)
          : Promise.resolve({ data: [] }),
      ])

      const teamsMap    = new Map((teamsRes.data ?? []).map(t => [t.id, t]))
      const profilesMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]))

      return players.map(p => ({
        ...p,
        // avatar_url : priorité au profil lié (toujours à jour), fallback sur players.avatar_url
        avatar_url: (p.user_id ? profilesMap.get(p.user_id)?.avatar_url : null) ?? p.avatar_url,
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

      const players = data as Player[]
      if (!players.length) return players

      // Récupère les avatars depuis profiles (toujours à jour)
      const userIds = players.map(p => p.user_id).filter(Boolean) as string[]
      if (!userIds.length) return players

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds)

      const profilesMap = new Map((profiles ?? []).map(p => [p.id, p]))

      return players.map(p => ({
        ...p,
        avatar_url: (p.user_id ? profilesMap.get(p.user_id)?.avatar_url : null) ?? p.avatar_url,
      }))
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
      const { data, error } = await supabase
        .from('players')
        .update({ is_active: false })
        .eq('id', id)
        .select('season_id, team_id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['players', data.season_id] })
      qc.invalidateQueries({ queryKey: ['players', 'team', data.team_id] })
    },
  })
}
