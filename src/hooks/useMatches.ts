import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatchWithTeams, MatchDetail, Database } from '@/types/database'

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
    // Filet de sécurité si Realtime rate un événement (useRealtimeMatch invalide déjà
    // cette query sur chaque changement de la table matches) — pas besoin d'un
    // intervalle agressif, Realtime gère la mise à jour quasi instantanée en temps normal.
    refetchInterval: (query) => {
      const data = query.state.data as MatchDetail | null | undefined
      return data?.status === 'live' ? 20_000 : false
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

/**
 * Supprime toutes les données liées à un match (polls, bet_slips orphelins,
 * buts, passes, événements, votes MVP, avis) avant de l'annuler — utilisé
 * par l'admin quand il annule un match avec nettoyage des données associées.
 * N'annule pas le match lui-même : à combiner avec useUpdateMatch côté appelant.
 */
export function useCancelMatchCleanup() {
  return useMutation({
    mutationFn: async (matchId: string) => {
      // 1. Supprimer les polls du match en premier (cascade → predictions, bet_slip_selections)
      const resPolls = await supabase.from('polls').delete().eq('match_id', matchId)
      if (resPolls.error) console.error('Error deleting polls:', resPolls.error)

      // 2. Supprimer les bet_slips qui n'ont plus aucune sélection (orphelins après cascade)
      const resOrphanSlips = await supabase.rpc('delete_empty_bet_slips')
      if (resOrphanSlips.error) console.error('Error deleting orphan bet_slips:', resOrphanSlips.error)

      // 3. Supprimer le reste des données liées au match
      const [resGoals, resAssists, resEvents, resVotes, resFeedback] = await Promise.all([
        supabase.from('goals').delete().eq('match_id', matchId),
        supabase.from('assists').delete().eq('match_id', matchId),
        supabase.from('match_events').delete().eq('match_id', matchId),
        supabase.from('mvp_votes').delete().eq('match_id', matchId),
        supabase.from('match_feedback').delete().eq('match_id', matchId),
      ])

      if (resGoals.error) console.error('Error deleting goals:', resGoals.error)
      if (resAssists.error) console.error('Error deleting assists:', resAssists.error)
      if (resEvents.error) console.error('Error deleting events:', resEvents.error)
      if (resVotes.error) console.error('Error deleting votes:', resVotes.error)
      if (resFeedback.error) console.error('Error deleting feedback:', resFeedback.error)
    },
  })
}
