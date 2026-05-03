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
    }) => {
      const { data, error } = await supabase
        .from('goals')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as Goal
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['matches', 'detail', data.match_id] })
      qc.invalidateQueries({ queryKey: ['scorers'] })
      qc.invalidateQueries({ queryKey: ['standings'] })
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, matchId }: { id: string; matchId: string }) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
      return matchId
    },
    onSuccess: (matchId) => {
      qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
      qc.invalidateQueries({ queryKey: ['scorers'] })
      qc.invalidateQueries({ queryKey: ['standings'] })
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
    }) => {
      const { data, error } = await supabase
        .from('assists')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as Assist
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['matches', 'detail', data.match_id] })
      qc.invalidateQueries({ queryKey: ['scorers'] })
    },
  })
}

export function useDeleteAssist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, matchId }: { id: string; matchId: string }) => {
      const { error } = await supabase.from('assists').delete().eq('id', id)
      if (error) throw error
      return matchId
    },
    onSuccess: (matchId) => {
      qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
      qc.invalidateQueries({ queryKey: ['scorers'] })
    },
  })
}
