import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Transfer, TransferStatus } from '@/types/database'
import { useActiveSeason } from './useSeasons'
import { useAuth } from './useAuth'

export function useTransfers() {
  const { data: season } = useActiveSeason()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['transfers', season?.id],
    enabled: !!season?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          player:players(*, team:teams!players_team_id_fkey(*)),
          from_team:teams(*),
          to_team:teams(*),
          requested_by:profiles(*),
          decided_by:profiles(*)
        `)
        .eq('season_id', season!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as unknown as (Transfer & {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        player?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        from_team?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to_team?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requested_by?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        decided_by?: any
      })[]
    },
  })

  const createTransfer = useMutation({
    mutationFn: async (transferData: {
      player_id: string
      from_team_id: string | null
      to_team_id: string
      reason?: string
    }) => {
      if (!season?.id) throw new Error('No active season')
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('transfers')
        .insert({
          player_id: transferData.player_id,
          from_team_id: transferData.from_team_id,
          to_team_id: transferData.to_team_id,
          season_id: season.id,
          requested_by: user.id,
          reason: transferData.reason,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  const updateTransfer = useMutation({
    mutationFn: async ({ id, status, reason }: {
      id: string
      status?: TransferStatus
      reason?: string
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {}
      if (status !== undefined) updateData.status = status
      if (reason !== undefined) updateData.reason = reason
      if (status && status !== 'pending' && user) {
        updateData.decided_at = new Date().toISOString()
        updateData.decided_by = user.id
      }

      const { data, error } = await supabase
        .from('transfers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      if (status === 'approved' || status === 'completed') {
        const transfer = data as Transfer
        await supabase
          .from('players')
          .update({ team_id: transfer.to_team_id })
          .eq('id', transfer.player_id)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['standings'] })
    },
  })

  const deleteTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transfers')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  return {
    ...query,
    createTransfer,
    updateTransfer,
    deleteTransfer,
  }
}
