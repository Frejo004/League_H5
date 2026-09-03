import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Poll, Prediction, Match, MatchWithTeams, Profile, Database, PollType } from '@/types/database'
import { useActiveSeason } from './useSeasons'
import { useAuth } from './useAuth'

type PollInsert = Database['public']['Tables']['polls']['Insert']
type PollUpdate = Database['public']['Tables']['polls']['Update']

export interface PollWithRelations extends Poll {
  match?: Match | MatchWithTeams
  created_by_user?: Pick<Profile, 'full_name' | 'avatar_url'>
}

export interface PredictionWithUser extends Prediction {
  user?: Pick<Profile, 'full_name' | 'avatar_url'>
}

export interface LeaderboardEntry {
  user_id: string
  season_id: string
  full_name: string | null
  avatar_url: string | null
  total_predictions: number
  correct_predictions: number
  total_points: number
  success_rate: number
}

// ─── Définition des types de pronostics automatiques ──────────────────────────

export const POLL_TYPE_CONFIG: Record<
  Exclude<PollType, 'custom'>,
  { label: string; question: (home: string, away: string) => string; options: string[] }
> = {
  winner: {
    label: 'Vainqueur',
    question: (h, a) => `Qui va gagner ? ${h} vs ${a}`,
    options: [], // généré dynamiquement avec les noms d'équipes
  },
  btts: {
    label: 'Les deux équipes marquent',
    question: () => 'Les deux équipes vont-elles marquer ?',
    options: ['Oui', 'Non'],
  },
  total_goals: {
    label: 'Total de buts',
    question: () => 'Combien de buts dans ce match ?',
    options: ['0 - 1 but', '2 - 3 buts', '4 buts et +'],
  },
  goals_home: {
    label: 'Buts domicile',
    question: (h) => `Combien de buts pour ${h} ?`,
    options: ['0 but', '1 but', '2 buts', '3 buts et +'],
  },
  goals_away: {
    label: 'Buts extérieur',
    question: (_, a) => `Combien de buts pour ${a} ?`,
    options: ['0 but', '1 but', '2 buts', '3 buts et +'],
  },
  goals_ht: {
    label: 'Buts à la mi-temps',
    question: () => 'Combien de buts à la mi-temps ?',
    options: ['0 but', '1 but', '2 buts et +'],
  },
  goals_ht_home: {
    label: 'Buts domicile MT',
    question: (h) => `${h} marque-t-il à la mi-temps ?`,
    options: ['0 but', '1 but', '2 buts et +'],
  },
  goals_ht_away: {
    label: 'Buts extérieur MT',
    question: (_, a) => `${a} marque-t-il à la mi-temps ?`,
    options: ['0 but', '1 but', '2 buts et +'],
  },
  cards_total: {
    label: 'Cartons dans le match',
    question: () => 'Combien de cartons dans ce match ?',
    options: ['0 - 1 carton', '2 - 3 cartons', '4 cartons et +'],
  },
  cards_home: {
    label: 'Cartons domicile',
    question: (h) => `Combien de cartons pour ${h} ?`,
    options: ['0 carton', '1 carton', '2 cartons et +'],
  },
  cards_away: {
    label: 'Cartons extérieur',
    question: (_, a) => `Combien de cartons pour ${a} ?`,
    options: ['0 carton', '1 carton', '2 cartons et +'],
  },
  shots_total: {
    label: 'Tirs dans le match',
    question: () => 'Combien de tirs dans ce match ?',
    options: ['0 - 4 tirs', '5 - 9 tirs', '10 tirs et +'],
  },
  shots_home: {
    label: 'Tirs domicile',
    question: (h) => `Combien de tirs pour ${h} ?`,
    options: ['0 - 4 tirs', '5 - 9 tirs', '10 tirs et +'],
  },
  shots_away: {
    label: 'Tirs extérieur',
    question: (_, a) => `Combien de tirs pour ${a} ?`,
    options: ['0 - 4 tirs', '5 - 9 tirs', '10 tirs et +'],
  },
  corners: {
    label: 'Corners',
    question: () => 'Combien de corners dans ce match ?',
    options: ['0 - 2 corners', '3 - 5 corners', '6 corners et +'],
  },
  fouls: {
    label: 'Fautes',
    question: () => 'Combien de fautes dans ce match ?',
    options: ['0 - 4 fautes', '5 - 9 fautes', '10 fautes et +'],
  },
  // ── Types joueur (options générées dynamiquement) ──────────────────────────
  first_scorer: {
    label: 'Premier buteur',
    question: (h, a) => `Qui marquera le premier but ? ${h} vs ${a}`,
    options: [], // généré dynamiquement avec les noms des joueurs
  },
  anytime_scorer: {
    label: 'Buteur dans le match',
    question: (h, a) => `Quel joueur marquera dans ce match ? ${h} vs ${a}`,
    options: [],
  },
  anytime_assister: {
    label: 'Passeur décisif',
    question: (h, a) => `Quel joueur donnera une passe décisive ? ${h} vs ${a}`,
    options: [],
  },
}

// Génère les options pour le type winner (avec les vrais noms d'équipes)
export function getWinnerOptions(homeName: string, awayName: string): string[] {
  return [homeName, 'Match nul', awayName]
}

// ─── usePolls ─────────────────────────────────────────────────────────────────

export function usePolls() {
  const { data: season } = useActiveSeason()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['polls', season?.id],
    enabled: !!season?.id,
    queryFn: async (): Promise<PollWithRelations[]> => {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          match:matches(*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)),
          created_by_user:profiles(full_name, avatar_url)
        `)
        .eq('season_id', season!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as unknown as PollWithRelations[]
    },
  })

  const createPoll = useMutation({
    mutationFn: async (pollData: Omit<PollInsert, 'season_id' | 'created_by' | 'id' | 'created_at' | 'updated_at'>) => {
      if (!season || !user) throw new Error('Missing data')

      const { data, error } = await supabase
        .from('polls')
        // @ts-expect-error Supabase insert typing inference issue
        .insert({
          ...pollData,
          season_id: season.id,
          created_by: user.id,
        } as PollInsert)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls'] }),
  })

  // Auto-créer tous les pronostics standards pour un match
  const createMatchPolls = useMutation({
    mutationFn: async ({
      matchId,
      homeName,
      awayName,
      scheduledAt,
      types,
    }: {
      matchId: string
      homeName: string
      awayName: string
      scheduledAt: string | null
      types: Exclude<PollType, 'custom'>[]
    }) => {
      if (!season || !user) throw new Error('Missing data')

      const polls: PollInsert[] = types.map((type) => {
        const config = POLL_TYPE_CONFIG[type]
        const options =
          type === 'winner'
            ? getWinnerOptions(homeName, awayName)
            : config.options
        return {
          season_id: season.id,
          match_id: matchId,
          question: config.question(homeName, awayName),
          options,
          poll_type: type,
          status: 'active' as const,
          ends_at: scheduledAt, // fermeture auto au coup d'envoi
          created_by: user.id,
        }
      })

      const { error } = await supabase.from('polls').insert(polls as never)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls'] }),
  })

  const updatePoll = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & PollUpdate) => {
      const { data, error } = await supabase
        .from('polls')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] })
      queryClient.invalidateQueries({ queryKey: ['poll', variables.id] })
    },
  })

  const deletePoll = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('polls').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls'] }),
  })

  const deleteAllPolls = useMutation({
    mutationFn: async (seasonId: string) => {
      const { error } = await supabase.from('polls').delete().eq('season_id', seasonId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls'] }),
  })

  const deleteAllPollsByMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.from('polls').delete().eq('match_id', matchId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls'] }),
  })

  // ── Créer les pronostics buteur/passeur pour un match ─────────────────────
  // Récupère les joueurs des deux équipes, génère les options dynamiquement,
  // stocke le player_id dans poll_meta pour la résolution automatique
  const createPlayerPolls = useMutation({
    mutationFn: async ({
      matchId,
      homeTeamId,
      awayTeamId,
      homeName,
      awayName,
      scheduledAt,
      types,
    }: {
      matchId: string
      homeTeamId: string
      awayTeamId: string
      homeName: string
      awayName: string
      scheduledAt: string | null
      types: ('first_scorer' | 'anytime_scorer' | 'anytime_assister')[]
    }) => {
      if (!season || !user) throw new Error('Missing data')

      // Récupérer les joueurs actifs des 2 équipes
      const { data: players, error: pErr } = await supabase
        .from('players')
        .select('id, first_name, last_name, team_id')
        .in('team_id', [homeTeamId, awayTeamId])
        .eq('is_active', true)
        .order('last_name', { ascending: true })

      if (pErr) throw pErr
      if (!players?.length) throw new Error('Aucun joueur trouvé pour ce match')

      const noGoalLabel = 'Aucun but'
      const noAssistLabel = 'Aucune passe'

      const polls: (typeof supabase extends { from: (t: string) => { insert: (v: infer I) => unknown } } ? never : never)[] = []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPolls: any[] = types.map(type => {
        const config = POLL_TYPE_CONFIG[type]
        const isAssist = type === 'anytime_assister'

        // Options = noms des joueurs + option "Aucun but/passe" en dernier
        const playerOptions = players.map((p: any) => `${p.first_name} ${p.last_name}`)
        const lastOption = isAssist ? noAssistLabel : noGoalLabel
        const options = [...playerOptions, lastOption]

        // Métadonnées : player_id pour chaque option (null pour la dernière)
        const option_player_ids = [...players.map((p: any) => p.id), null]

        return {
          season_id: season.id,
          match_id: matchId,
          question: config.question(homeName, awayName),
          options,
          poll_type: type,
          status: 'active' as const,
          ends_at: scheduledAt,
          created_by: user.id,
          poll_meta: { option_player_ids },
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = polls

      const { error } = await supabase.from('polls').insert(insertPolls as never)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls'] }),
  })

  return { ...query, createPoll, createMatchPolls, createPlayerPolls, updatePoll, deletePoll, deleteAllPolls, deleteAllPollsByMatch }
}

// ─── usePoll ──────────────────────────────────────────────────────────────────

export function usePoll(pollId: string) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const pollQuery = useQuery({
    queryKey: ['poll', pollId],
    enabled: !!pollId,
    queryFn: async (): Promise<PollWithRelations> => {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          match:matches(*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)),
          created_by_user:profiles(full_name, avatar_url)
        `)
        .eq('id', pollId)
        .single()

      if (error) throw error
      return data as unknown as PollWithRelations
    },
  })

  const predictionsQuery = useQuery({
    queryKey: ['poll-predictions', pollId],
    enabled: !!pollId,
    queryFn: async (): Promise<PredictionWithUser[]> => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*, user:profiles(full_name, avatar_url)')
        .eq('poll_id', pollId)

      if (error) throw error
      return data as unknown as PredictionWithUser[]
    },
  })

  const userPredictionQuery = useQuery({
    queryKey: ['user-prediction', pollId, user?.id],
    enabled: !!pollId && !!user?.id,
    queryFn: async (): Promise<Prediction | null> => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('poll_id', pollId)
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) throw error
      return data as Prediction | null
    },
  })

  const vote = useMutation({
    mutationFn: async ({ optionIndex }: { optionIndex: number }) => {
      if (!user) throw new Error('Not authenticated')

      // Vérifier si l'utilisateur a déjà voté — vote définitif
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        // Vote déjà enregistré — on ne modifie pas
        throw new Error('ALREADY_VOTED')
      }

      const { data, error } = await supabase
        .from('predictions')
        // @ts-expect-error Supabase insert typing inference issue
        .insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll-predictions', pollId] })
      queryClient.invalidateQueries({ queryKey: ['user-prediction'] })
    },
  })

  return { poll: pollQuery, predictions: predictionsQuery, userPrediction: userPredictionQuery, vote }
}

// ─── usePollsByMatch ─────────────────────────────────────────────────────────
// Récupère les sondages liés à un match précis (pour la page détail du match)
export function usePollsByMatch(matchId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['polls-by-match', matchId],
    enabled: !!matchId,
    queryFn: async (): Promise<PollWithRelations[]> => {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('match_id', matchId!)
        .in('status', ['active', 'closed', 'completed'])
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as PollWithRelations[]
    },
  })

  // Realtime : rafraîchit instantanément quand un poll du match change (résolution auto)
  useEffect(() => {
    if (!matchId) return
    const name = `polls-match-${matchId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'polls',
        filter: `match_id=eq.${matchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['polls-by-match', matchId] })
        queryClient.invalidateQueries({ queryKey: ['poll-counts-public'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchId, queryClient])

  // Realtime sur predictions : met à jour les comptages quand quelqu'un vote
  useEffect(() => {
    if (!matchId || !user) return
    const name = `predictions-match-${matchId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'predictions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['poll-predictions'] })
        queryClient.invalidateQueries({ queryKey: ['poll-counts-public'] })
        queryClient.invalidateQueries({ queryKey: ['user-prediction'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchId, user, queryClient])

  return query
}

// ─── useLeaderboard ───────────────────────────────────────────────────────────

export function useLeaderboard(seasonId?: string) {
  return useQuery({
    queryKey: ['leaderboard', seasonId],
    enabled: !!seasonId,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('predictions_leaderboard')
        .select('*')
        .eq('season_id', seasonId!)
        .order('total_points', { ascending: false })
        .order('success_rate', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data ?? []) as LeaderboardEntry[]
    },
  })
}
