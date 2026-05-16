import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Match, MatchWithTeams, MatchDetail } from '@/types/database'

// Re-export pour les imports existants qui importent depuis ce fichier
export type { MatchWithTeams } from '@/types/database'

export function useMatches(seasonId?: string) {
  return useQuery({
    queryKey: ['matches', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!home_team_id(id, name, color, logo_url, captain_id),
          away_team:teams!away_team_id(id, name, color, logo_url, captain_id)
        `)
        .eq('season_id', seasonId!)
        .order('matchday', { ascending: true })
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as unknown as MatchWithTeams[]
    },
  })
}

export function useMatch(matchId?: string) {
  return useQuery({
    queryKey: ['matches', 'detail', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!home_team_id(id, name, color, logo_url, captain_id),
          away_team:teams!away_team_id(id, name, color, logo_url, captain_id),
          seasons(id, name),
          goals(*, players(id, first_name, last_name, jersey_number)),
          assists(*, players(id, first_name, last_name))
        `)
        .eq('id', matchId!)
        .single()
      if (error) throw error
      return data as unknown as MatchDetail
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    // Rafraîchissement automatique toutes les 5s quand le match est live
    // pour s'assurer que live_started_at, live_period, is_paused sont toujours à jour
    refetchInterval: (query) => {
      const data = query.state.data as MatchDetail | undefined
      return data?.status === 'live' ? 5000 : false
    },
  })
}

export function useCreateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      season_id: string
      home_team_id: string
      away_team_id: string
      matchday: number
      scheduled_at?: string | null
      venue?: string | null
    }) => {
      const { data, error } = await supabase.from('matches').insert(values).select().single()
      if (error) throw error
      return data as Match
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['matches', variables.season_id] }),
  })
}

export function useUpdateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Match> & { id: string }) => {
      // Exclure les colonnes système pour éviter l'erreur de type
      const { created_at, updated_at, ...updateData } = values as any
      
      const { data, error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Match
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['matches', data.season_id] })
      qc.invalidateQueries({ queryKey: ['matches', 'detail', data.id] })
      qc.invalidateQueries({ queryKey: ['standings', data.season_id] })
      qc.invalidateQueries({ queryKey: ['scorers', data.season_id] })
      qc.invalidateQueries({ queryKey: ['assists', data.season_id] })
      qc.invalidateQueries({ queryKey: ['landing-stats', data.season_id] })
      qc.invalidateQueries({ queryKey: ['disciplinary', data.season_id] })
    },
  })
}

export function useDeleteMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, seasonId }: { id: string; seasonId: string }) => {
      const { error } = await supabase.from('matches').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, { seasonId }) => {
      qc.invalidateQueries({ queryKey: ['matches', seasonId] })
      qc.invalidateQueries({ queryKey: ['standings', seasonId] })
    },
  })
}
