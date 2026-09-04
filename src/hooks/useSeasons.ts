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
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
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
        .maybeSingle()
      if (error) throw error
      return data as Season | null
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export function useCreateSeason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: { name: string; start_date?: string; end_date?: string }) => {
      const { data, error } = await (supabase.from('seasons') as any).insert(values).select().single()
      if (error) throw error
      return data as Season
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seasons'] }),
  })
}

export function useUpdateSeason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Omit<Partial<Season>, 'created_at'> & { id: string }) => {
      const { data, error } = await (supabase.from('seasons') as any)
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

export function useDeleteSeason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seasons').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seasons'] })
      qc.invalidateQueries({ queryKey: ['seasons', 'active'] })
    },
  })
}
