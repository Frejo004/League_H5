import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Season } from '@/types/database'

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Season[]
    },
  })
}

export function useActiveSeason() {
  return useQuery({
    queryKey: ['seasons', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data as Season
    },
  })
}

export function useCreateSeason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: { name: string; start_date?: string; end_date?: string }) => {
      const { data, error } = await supabase.from('seasons').insert(values).select().single()
      if (error) throw error
      return data as Season
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seasons'] }),
  })
}

export function useUpdateSeason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Season> & { id: string }) => {
      const { data, error } = await supabase
        .from('seasons')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Season
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seasons'] }),
  })
}
