import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Goal, Assist } from '@/types/database'

// ── Goals ─────────────────────────────────────────────────────────────────────

export function useAddGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      match_id: string
      player_id: string
      team_id: string
      minute?: number | null
      is_own_goal?: boolean
      seasonId: string  // nécessaire pour invalider les bonnes clés de cache
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { seasonId: _seasonId, ...dbValues } = values
      const { data, error } = await supabase
        .from('goals')
        // @ts-expect-error Supabase insert typing inference issue
        .insert(dbValues as never[])
        .select()
        .single()
      if (error) throw error
      return data as Goal
    },
    onSuccess: (data, variables) => { // TODO: Envisager d'implémenter des mises à jour optimistes pour une UX plus fluide.
      qc.invalidateQueries({ queryKey: ['matches', 'detail', data.match_id] });
      qc.invalidateQueries({ queryKey: ['scorers', variables.seasonId] });
      qc.invalidateQueries({ queryKey: ['standings', variables.seasonId] });
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, matchId, seasonId }: { id: string; matchId: string; seasonId: string }) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
      return { matchId, seasonId }
    },
    onSuccess: ({ matchId, seasonId }) => {
      qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
      qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
      qc.invalidateQueries({ queryKey: ['standings', seasonId] })
    },
  })
}

// ── Assists ───────────────────────────────────────────────────────────────────

export function useAddAssist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      match_id: string
      goal_id: string
      player_id: string
      seasonId: string  // nécessaire pour invalider les bonnes clés de cache
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { seasonId: _seasonId, ...dbValues } = values
      const { data, error } = await supabase
        .from('assists')
        // @ts-expect-error Supabase insert typing inference issue
        .insert(dbValues as never[])
        .select()
        .single()
      if (error) throw error
      return data as Assist
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['matches', 'detail', data.match_id] })
      qc.invalidateQueries({ queryKey: ['scorers', variables.seasonId] })
    },
  })
}

export function useDeleteAssist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, matchId, seasonId }: { id: string; matchId: string; seasonId: string }) => {
      const { error } = await supabase.from('assists').delete().eq('id', id)
      if (error) throw error
      return { matchId, seasonId }
    },
    onSuccess: ({ matchId, seasonId }) => {
      qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
      qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
    },
  })
}
