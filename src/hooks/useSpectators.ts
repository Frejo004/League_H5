import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SpectatorStatus } from '@/types/database'

export function useSpectators(seasonId?: string) {
  return useQuery({
    queryKey: ['spectators', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spectators')
        .select('*, profiles(id, full_name, email, avatar_url)')
        .eq('season_id', seasonId!)
        .order('requested_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useUpdateSpectatorStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewedBy,
    }: {
      id: string
      status: SpectatorStatus
      reviewedBy: string
    }) => {
      const { data, error } = await supabase
        .from('spectators')
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spectators'] }),
  })
}
