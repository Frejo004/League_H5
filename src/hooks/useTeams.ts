import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Team, Database } from '@/types/database'

export interface TeamWithPlayersCount extends Team {
  players?: { count: number }[]
}

export function useTeams(seasonId?: string) {
  return useQuery<TeamWithPlayersCount[]>({
    queryKey: ['teams', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, slug, players!players_team_id_fkey(count)')
        .eq('season_id', seasonId!)
        .eq('players.is_active', true)
        .order('name') as { data: TeamWithPlayersCount[] | null; error: unknown }
      if (error) {
        const { data: fallback, error: fallbackErr } = await supabase
          .from('teams')
          .select('*, slug')
          .eq('season_id', seasonId!)
          .order('name')
        if (fallbackErr) throw fallbackErr
        return (fallback ?? []) as unknown as TeamWithPlayersCount[]
      }
      return (data ?? []) as TeamWithPlayersCount[]
    },
  })
}

// Fonction utilitaire pour éviter la duplication de code lors de la récupération des joueurs et de leurs avatars
async function fetchTeamPlayersWithAvatars(teamId: string): Promise<(Record<string, unknown>)[]> {
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('jersey_number', { ascending: true })
  if (playersErr) throw playersErr

  const playersList = (players ?? []) as Record<string, unknown>[]
  const userIds = playersList
    .map(p => p.user_id as string | null | undefined)
    .filter((id): id is string => Boolean(id))
  const profilesMap = new Map<string, string | null>()
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds)
    for (const prof of (profiles ?? []) as Array<{ id: string; avatar_url: string | null }>) {
      profilesMap.set(prof.id, prof.avatar_url)
    }
  }

  return playersList.map((p) => {
    const userId = p.user_id as string | null | undefined
    return {
      ...p,
      avatar_url: (userId ? profilesMap.get(userId) : null) ?? (p.avatar_url as string | null | undefined) ?? null,
    }
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

      const playersWithAvatar = await fetchTeamPlayersWithAvatars(teamId!);

      return { ...(team as Team), players: playersWithAvatar } as Team & { players: Awaited<ReturnType<typeof fetchTeamPlayersWithAvatars>> }
    },
  })
}

/**
 * Hook pour récupérer une équipe par son slug
 * @param slug - Le slug de l'équipe (ex: "paris-saint-germain")
 * @param seasonId - L'ID de la saison (optionnel, utilise la saison active par défaut)
 */
export function useTeamBySlug(slug?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['teams', 'slug', slug, seasonId],
    enabled: !!slug,
    queryFn: async () => {
      // Construire la requête
      let query = supabase
        .from('teams')
        .select('*')
        .eq('slug', slug!)
      
      // Filtrer par saison si fourni
      if (seasonId) {
        query = query.eq('season_id', seasonId)
      }
      
      const { data: team, error: teamErr } = await query.single()
      if (teamErr) throw teamErr
      const teamData = team as Team
      if (!teamData) throw new Error('Team not found')

      // Requête 2 : les joueurs actifs de l'équipe
      const playersWithAvatar = await fetchTeamPlayersWithAvatars(teamData.id);

      return { ...teamData, players: playersWithAvatar } as Team & { players: Awaited<ReturnType<typeof fetchTeamPlayersWithAvatars>> }
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
      const { data, error } = await supabase.from('teams')
        .insert(values as never)
        .select()
        .single()
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
        .update(values as never)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Team
    },
    onSuccess: () => {
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
      } as never)
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
    mutationFn: async ({ id }: { id: string; seasonId: string }) => {
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
