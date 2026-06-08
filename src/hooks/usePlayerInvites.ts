import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface InvitePlayerInfo {
  player_id: string
  first_name: string
  last_name: string
  team_name: string
  is_valid: boolean
}

/** Resolve a token before signup — works unauthenticated */
export async function resolveInviteToken(token: string): Promise<InvitePlayerInfo | null> {
  const { data, error } = await supabase.rpc('get_invite_player', { p_token: token });
  if (error) {
    console.error('[resolveInviteToken] Erreur lors de la récupération de l\'invitation:', error);
    return null;
  }
  if (!data?.length) return null;
  return data[0] as InvitePlayerInfo
}

/** Claim an invite after signup — links user_id to player */
export async function claimInvite(token: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_player_invite', {
    p_token: token,
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
}

/** List invites for a given player (admin/captain use) */
export function usePlayerInvite(playerId?: string) {
  return useQuery({
    queryKey: ['player_invites', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_invites')
        .select('*')
        .eq('player_id', playerId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Create (or replace) an invite for a player */
export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      playerId,
      createdBy,
    }: {
      playerId: string
      createdBy: string
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc('upsert_player_invite' as any, {
        p_player_id: playerId,
        p_created_by: createdBy
      });
      if (error) throw error
      return data as string
    },
    onSuccess: (_token, { playerId }) => {
      qc.invalidateQueries({ queryKey: ['player_invites', playerId] })
    },
  })
}

/** Revoke an invite */
export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from('player_invites')
        .delete()
        .eq('player_id', playerId)
      if (error) throw error
    },
    onSuccess: (_data, playerId) => {
      qc.invalidateQueries({ queryKey: ['player_invites', playerId] })
    },
  })
}
