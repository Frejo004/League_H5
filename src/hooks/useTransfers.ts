import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Transfer } from '@/types/database'
import { useActiveSeason } from './useSeasons'
import { useAuth } from './useAuth'

// Workaround : le select enrichi avec des alias de jointures (ex: player:players(*))
// corrompt l'inférence de type du client Supabase pour toutes les tables dans le
// même fichier. On isole le select dans une fonction externe, et on force le type
// via un helper `db` non-typé pour les mutations DML qui n'ont pas besoin des jointures.
// Voir : https://github.com/supabase/supabase-js/issues/1219
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

async function fetchTransfers(seasonId: string, teamId?: string) {
  const base = supabase
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
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })

  const { data, error } = await (
    teamId
      ? base.or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`)
      : base
  )

  if (error) throw error
  return (data ?? []) as unknown as (Transfer & {
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
}

export function useTransfers(teamId?: string) {
  const { data: season } = useActiveSeason()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['transfers', season?.id, teamId],
    enabled: !!season?.id,
    queryFn: () => fetchTransfers(season!.id, teamId),
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

      const { data, error } = await db
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
      return data as Transfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  const approveAsHomeCaptain = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await db
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
      return data as Transfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  const approveAsAdmin = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await db
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
      return data as Transfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  const approveAsAwayCaptain = useMutation({
    mutationFn: async (id: string) => {
      if (!season?.id) throw new Error('No active season')
      if (!user?.id) throw new Error('Not authenticated')

      // 1. Mettre à jour le statut du transfert
      const { data: transfer, error: transferError } = await db
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
      if (!transfer) throw new Error('Transfert introuvable après mise à jour.')

      const t = transfer as Transfer

      // 2. Déplacer le joueur vers sa nouvelle équipe — erreur fatale si ça échoue
      const { error: playerError } = await db
        .from('players')
        .update({ team_id: t.to_team_id })
        .eq('id', t.player_id)

      if (playerError) {
        console.error('[approveAsAwayCaptain] Échec du déplacement du joueur:', playerError)
        throw new Error(
          `Transfert validé mais le joueur n'a pas pu être déplacé : ${playerError.message}. Contactez un administrateur.`
        )
      }

      // 3. Créer la news automatique (non bloquante — échec ignoré silencieusement)
      const { error: newsError } = await db
        .from('news_posts')
        .insert({
          season_id: season.id,
          title: 'Nouveau transfert !',
          content: 'Un joueur a rejoint une nouvelle équipe.',
          is_pinned: false,
          author_id: user.id,
        })

      if (newsError) {
        console.warn('[approveAsAwayCaptain] Impossible de créer la news automatique:', newsError)
      }

      return t
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

      const { data, error } = await db
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
      return data as Transfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', season?.id] })
    },
  })

  const deleteTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
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
