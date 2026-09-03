import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Match, MatchWithTeams, MatchDetail, Database } from '@/types/database'

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

// Fonction utilitaire pour éviter la duplication de code lors de la récupération des détails de match
async function fetchMatchDetails(matchIdentifier: string, isSlug: boolean, seasonId?: string): Promise<MatchDetail | null> {
  let query = supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!home_team_id(id, name, color, logo_url, captain_id),
      away_team:teams!away_team_id(id, name, color, logo_url, captain_id),
      seasons(id, name),
      goals(*, players(id, first_name, last_name, jersey_number, user_id, avatar_url)),
      assists(*, players(id, first_name, last_name, user_id, avatar_url))
    `);

  if (isSlug) {
    query = query.eq('slug', matchIdentifier);
  } else {
    query = query.eq('id', matchIdentifier);
  }
  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as unknown as MatchDetail | null;
}

export function useMatch(matchId?: string) {
  return useQuery({
    queryKey: ['matches', 'detail', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      return fetchMatchDetails(matchId!, false);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    // Rafraîchissement automatique toutes les 5s quand le match est live
    // pour s'assurer que live_started_at, live_period, is_paused sont toujours à jour
    refetchInterval: (query) => {
      const data = query.state.data as MatchDetail | null | undefined
      return data?.status === 'live' ? 5000 : false
    },
  })
}

/**
 * Hook pour récupérer un match par son slug
 * @param slug - Le slug du match (ex: "psg-vs-om-j10")
 * @param seasonId - L'ID de la saison (optionnel, utilise la saison active par défaut)
 */
export function useMatchBySlug(slug?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['matches', 'slug', slug, seasonId],
    enabled: !!slug,
    queryFn: async () => {
      return fetchMatchDetails(slug!, true, seasonId);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const data = query.state.data as MatchDetail | null | undefined
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
      const { data, error } = await supabase
        .from('matches')
        // @ts-expect-error Supabase insert typing inference issue
        .insert(values as Database['public']['Tables']['matches']['Insert'])
        .select()
        .single()
      if (error) throw error
      return data as Database['public']['Tables']['matches']['Row']
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['matches', variables.season_id] }),
  })
}

export function useUpdateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<Database['public']['Tables']['matches']['Update']>) => {
      const { data, error } = await supabase
        .from('matches')
        // @ts-expect-error Supabase update typing inference issue
        .update(values as Database['public']['Tables']['matches']['Update'])
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Database['public']['Tables']['matches']['Row']
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
