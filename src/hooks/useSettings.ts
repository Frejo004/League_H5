import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types/database'

export function useSettings(seasonId?: string) {
  return useQuery({
    queryKey: ['settings', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('season_id', seasonId!)
        .maybeSingle()
      if (error) throw error
      return data as Settings | null
    },
  })
}

export function useUpsertSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<Settings> & { season_id: string }) => {
      const { data, error } = await supabase
        .from('settings')
        .upsert(values, { onConflict: 'season_id' })
        .select()
        .single()
      if (error) throw error
      return data as Settings
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['settings', data.season_id] }),
  })
}
