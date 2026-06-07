import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Poll, Prediction, Match, MatchWithTeams, Profile, Database } from '@/types/database'
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
          match:matches(*),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] })
    },
  })

  const updatePoll = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & PollUpdate) => {
      const { data, error } = await supabase
        .from('polls')
        .update(updates)
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
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] })
    },
  })

  return { ...query, createPoll, updatePoll, deletePoll }
}

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
          match:matches(*, home_team:teams(*), away_team:teams(*)),
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

      const { data: existing } = await supabase
        .from('predictions')
        .select('*')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        const { data, error } = await supabase
          .from('predictions')
          .update({ option_index: optionIndex })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('predictions')
          .insert({
            poll_id: pollId,
            user_id: user.id,
            option_index: optionIndex,
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll-predictions', pollId] })
      queryClient.invalidateQueries({ queryKey: ['user-prediction'] })
    },
  })

  return {
    poll: pollQuery,
    predictions: predictionsQuery,
    userPrediction: userPredictionQuery,
    vote,
  }
}
