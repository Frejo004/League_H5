import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Team } from '@/types/database'

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
      const { data, error } = await supabase
        .from('teams')
        .select('*, players(*)')
        .eq('id', teamId!)
        .single()
      if (error) throw error
      return data
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
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['teams', variables.season_id] }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Team> & { id: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Team
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['teams', data.season_id] }),
  })
}

// Définir le capitaine d'une équipe (admin uniquement)
// Utilise captain_id pour stocker le player_id du capitaine désigné.
// Quand le joueur crée son compte, son rôle sera mis à 'captain' via
// la logique de claim_player_invite.
export function useSetCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      teamId,
      captainPlayerId,
      captainUserId,
      seasonId,
    }: {
      teamId: string
      captainPlayerId: string | null
      captainUserId: string | null
      seasonId: string
    }) => {
      // Met à jour captain_id avec le user_id si disponible, sinon null
      // (le joueur sans compte sera mis à jour quand il créera son compte)
      const { error: teamErr } = await supabase
        .from('teams')
        .update({ captain_id: captainUserId })
        .eq('id', teamId)
      if (teamErr) throw teamErr

      // Si le joueur a déjà un compte, mettre son rôle à 'captain'
      if (captainUserId) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ role: 'captain' })
          .eq('id', captainUserId)
        if (profileErr) throw profileErr
      }
    },
    onSuccess: (_data, { seasonId }) => {
      qc.invalidateQueries({ queryKey: ['teams', seasonId] })
      qc.invalidateQueries({ queryKey: ['teams', 'detail'] })
    },
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, seasonId }: { id: string; seasonId: string }) => {
      const { error } = await supabase.from('teams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, { seasonId }) =>
      qc.invalidateQueries({ queryKey: ['teams', seasonId] }),
  })
}
