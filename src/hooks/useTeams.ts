import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Team } from '@/types/database'

export function useTeams(seasonId?: string) {
  return useQuery({
    queryKey: ['teams', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, players(count)')
        .eq('season_id', seasonId!)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useTeam(teamId?: string) {
  return useQuery({
    queryKey: ['teams', 'detail', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, players(*)')
        .eq('id', teamId!)
        .single()
      if (error) throw error
      return data
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
      const { data, error } = await supabase.from('teams').insert(values).select().single()
      if (error) throw error
      return data as Team
    },
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['teams', variables.season_id] }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Team> & { id: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Team
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['teams', data.season_id] }),
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })
}
