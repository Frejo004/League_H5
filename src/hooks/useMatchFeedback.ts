import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatchFeedback, PlayerWithTeam } from '@/types/database'

// Type pour le feedback avec joueur et équipe
export type MatchFeedbackWithPlayer = MatchFeedback & {
  players: PlayerWithTeam
}

// Hook pour récupérer les feedbacks d'un match
export function useMatchFeedback(matchId?: string) {
  return useQuery({
    queryKey: ['matchFeedback', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_feedback')
        .select(`
          *,
          players(*)
        `)
        .eq('match_id', matchId as any)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data as MatchFeedbackWithPlayer[]
    }
  })
}

// Hook pour récupérer le feedback de l'utilisateur courant pour un match
export function useMyMatchFeedback(matchId?: string, playerId?: string | null) {
  const { data: feedbacks } = useMatchFeedback(matchId)
  return feedbacks?.find(f => f.player_id === playerId)
}

// Hook pour ajouter un feedback
export function useAddMatchFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (feedback: {
      match_id: string
      player_id: string
      team_id: string
      overall_experience?: string | null
      referee_performance?: string | null
      player_behavior?: string | null
      other_comments?: string | null
    }) => {
      const { data, error } = await (supabase.from('match_feedback') as any)
        .insert(feedback)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ['matchFeedback', variables.match_id]
      })
    }
  })
}

// Hook pour modifier un feedback
export function useUpdateMatchFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (feedback: {
      id: string
      match_id: string
      overall_experience?: string | null
      referee_performance?: string | null
      player_behavior?: string | null
      other_comments?: string | null
    }) => {
      const { data, error } = await (supabase.from('match_feedback') as any)
        .update({
          overall_experience: feedback.overall_experience,
          referee_performance: feedback.referee_performance,
          player_behavior: feedback.player_behavior,
          other_comments: feedback.other_comments,
        })
        .eq('id', feedback.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ['matchFeedback', variables.match_id]
      })
    }
  })
}

// Hook pour supprimer un feedback
export function useDeleteMatchFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; match_id: string }) => {
      const { error } = await supabase
        .from('match_feedback')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ['matchFeedback', variables.match_id]
      })
    }
  })
}