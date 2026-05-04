import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Spectator, SpectatorStatus } from '@/types/database'

// Extended type returned by useSpectators (includes joined profile data)
export interface SpectatorWithProfile extends Spectator {
  profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null }
}

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
      return data as unknown as SpectatorWithProfile[]
    },
  })
}

// Hook pour qu'un user vérifie le statut de sa propre demande
export function useMySpectatorRequest(userId?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['spectators', 'me', userId, seasonId],
    enabled: !!userId && !!seasonId,
    staleTime: 1000 * 30, // refetch fréquent pour détecter l'approbation
    refetchInterval: 10000, // poll toutes les 10s tant que pending
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spectators')
        .select('*')
        .eq('user_id', userId!)
        .eq('season_id', seasonId!)
        .maybeSingle()
      if (error) throw error
      return data as Spectator | null
    },
  })
}

// Créer une demande d'accès spectateur
export function useRequestSpectatorAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
      const { data, error } = await supabase
        .from('spectators')
        .upsert(
          { user_id: userId, season_id: seasonId, status: 'pending' },
          { onConflict: 'user_id,season_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data as Spectator
    },
    onSuccess: (_data, { userId, seasonId }) => {
      qc.invalidateQueries({ queryKey: ['spectators', 'me', userId, seasonId] })
      qc.invalidateQueries({ queryKey: ['spectators'] })
      qc.invalidateQueries({ queryKey: ['notifications_spectators'] })
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
      userId,
    }: {
      id: string
      status: SpectatorStatus
      reviewedBy: string
      userId: string
    }) => {
      // 1. Mettre à jour le statut de la demande
      const { data, error } = await supabase
        .from('spectators')
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // 2. Si approuvé, mettre à jour le rôle du profil (spectator → spectator approuvé)
      //    On garde le rôle 'spectator' mais on marque via la table spectators
      //    Si refusé, on ne change rien au profil
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spectators'] })
      qc.invalidateQueries({ queryKey: ['notifications_spectators'] })
    },
  })
}
