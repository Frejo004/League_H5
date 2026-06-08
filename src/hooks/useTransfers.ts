import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Transfer } from '@/types/database'
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
          from_team:teams!transfers_from_team_id_fkey(*),
          to_team:teams!transfers_to_team_id_fkey(*),
          requested_by:profiles!transfers_requested_by_fkey(*),
          decided_by:profiles!transfers_decided_by_fkey(*),
          home_captain_approved_by_profile:profiles!transfers_home_captain_approved_by_fkey(*),
          admin_approved_by_profile:profiles!transfers_admin_approved_by_fkey(*),
          away_captain_approved_by_profile:profiles!transfers_away_captain_approved_by_fkey(*)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        home_captain_approved_by_profile?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        admin_approved_by_profile?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        away_captain_approved_by_profile?: any
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
          status: 'player_requested',
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

  const approveAsHomeCaptain = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('transfers')
        .update({
          status: 'home_captain_approved',
          home_captain_approved_by: user.id,
          home_captain_approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  const approveAsAdmin = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('transfers')
        .update({
          status: 'admin_approved',
          admin_approved_by: user.id,
          admin_approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  const approveAsAwayCaptain = useMutation({
    mutationFn: async (id: string) => {
      if (!season?.id) throw new Error('No active season')
      if (!user?.id) throw new Error('Not authenticated')

      // First, update the transfer status
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .update({
          status: 'completed',
          away_captain_approved_by: user.id,
          away_captain_approved_at: new Date().toISOString(),
          decided_by: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (transferError) throw transferError

      // Update the player's team
      await supabase
        .from('players')
        .update({ team_id: transfer.to_team_id })
        .eq('id', transfer.player_id)

      // Create an automatic news post
      await supabase
        .from('news_posts')
        .insert({
          season_id: season.id,
          title: 'Nouveau transfert !',
          content: 'Un joueur a rejoint une nouvelle équipe.',
          is_pinned: false,
          author_id: user.id,
        })

      return transfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['standings'] })
      queryClient.invalidateQueries({ queryKey: ['news'] })
    },
  })

  const rejectTransfer = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('transfers')
        .update({
          status: 'rejected',
          decided_by: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
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
    approveAsHomeCaptain,
    approveAsAdmin,
    approveAsAwayCaptain,
    rejectTransfer,
    deleteTransfer,
  }
}
