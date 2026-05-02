import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Match } from '@/types/database'

// Extended type returned by useMatches (includes joined team data)
export interface MatchWithTeams extends Match {
  home_team: { id: string; name: string; color: string; logo_url: string | null }
  away_team: { id: string; name: string; color: string; logo_url: string | null }
}

export function useMatches(seasonId?: string) {
  return useQuery({
    queryKey: ['matches', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!home_team_id(id, name, color, logo_url),
          away_team:teams!away_team_id(id, name, color, logo_url)
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
          home_team:teams!home_team_id(id, name, color, logo_url),
          away_team:teams!away_team_id(id, name, color, logo_url),
          goals(*, players(id, first_name, last_name, jersey_number)),
          assists(*, players(id, first_name, last_name))
        `)
        .eq('id', matchId!)
        .single()
      if (error) throw error
      return data
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
      const { data, error } = await supabase
        .from('matches')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Match
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['matches', data.season_id] })
      qc.invalidateQueries({ queryKey: ['matches', 'detail', data.id] })
      // Standings depend on match results
      qc.invalidateQueries({ queryKey: ['standings'] })
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
      qc.invalidateQueries({ queryKey: ['standings'] })
    },
  })
}
