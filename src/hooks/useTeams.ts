import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Team, Database } from '@/types/database'

export function useTeams(seasonId?: string) {
  return useQuery({
    queryKey: ['teams', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, players!players_team_id_fkey(count)')
        .eq('season_id', seasonId!)
        .order('name')
      if (error) {
        // Fallback sans le count si la relation échoue
        const { data: fallback, error: fallbackErr } = await supabase
          .from('teams')
          .select('*')
          .eq('season_id', seasonId!)
          .order('name')
        if (fallbackErr) throw fallbackErr
        return fallback
      }
      return data
    },
  })
}

export function useTeam(teamId?: string) {
  return useQuery({
    queryKey: ['teams', 'detail', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      // Requête 1 : l'équipe seule
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId!)
        .single()
      if (teamErr) throw teamErr

      // Requête 2 : les joueurs actifs de l'équipe
      const { data: players, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId!)
        .eq('is_active', true)
        .order('jersey_number', { ascending: true })
      if (playersErr) throw playersErr

      // Requête 3 : avatars depuis profiles pour les joueurs avec un compte
      const userIds = (players ?? []).map(p => p.user_id).filter(Boolean) as string[]
      const profilesMap = new Map<string, string | null>()
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds)
        for (const prof of profiles ?? []) {
          profilesMap.set(prof.id, prof.avatar_url)
        }
      }

      const playersWithAvatar = (players ?? []).map(p => ({
        ...p,
        avatar_url: (p.user_id ? profilesMap.get(p.user_id) : null) ?? p.avatar_url,
      }))

      return { ...team, players: playersWithAvatar }
    },
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      season_id: string
      name: string
      color?: string
      logo_url?: string | null
    }) => {
      const { data, error } = await supabase.from('teams').insert(values).select().single()
      if (error) throw error
      return data as Team
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['standings'] })
    },
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Database['public']['Tables']['teams']['Update'] & { id: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Team
    },
    onSuccess: (data) => {
      // Invalider toutes les queries qui contiennent des données d'équipes
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['standings'] })
      qc.invalidateQueries({ queryKey: ['scorers'] })
      qc.invalidateQueries({ queryKey: ['mvp-ranking'] })
      qc.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

// Définir le capitaine d'une équipe (admin uniquement)
// Passe par la fonction RPC set_team_captain (security definer)
// qui vérifie côté serveur que l'appelant est bien admin.
export function useSetCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      teamId,
      captainPlayerId,
      captainUserId,
      seasonId: _seasonId,  // utilisé dans onSuccess via les variables
    }: {
      teamId: string
      captainPlayerId: string | null
      captainUserId: string | null
      seasonId: string
    }) => {
      const { error } = await supabase.rpc('set_team_captain', {
        p_team_id:           teamId,
        p_captain_player_id: captainPlayerId,
        p_captain_user_id:   captainUserId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, seasonId: _seasonId }: { id: string; seasonId: string }) => {
      const { error } = await supabase.from('teams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['standings'] })
      qc.invalidateQueries({ queryKey: ['players'] })
    },
  })
}
