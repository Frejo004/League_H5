/**
 * useChatUnread
 *
 * Calcule le nombre de messages non lus par équipe.
 * Utilise les RPCs SQL agrégées pour éviter les N+1 queries.
 */

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { pushLocal } from '@/hooks/useRealtime' // Importer la fonction d'aide

export interface TeamUnread {
  teamId: string
  teamName: string
  teamColor: string
  logo_url: string | null
  unread: number
  lastMessage: string | null
  lastMessageAt: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch via RPC — 1 requête au lieu de 2×N
// ─────────────────────────────────────────────────────────────────────────────

async function fetchUnreadCounts(userId: string, isAdmin: boolean): Promise<TeamUnread[]> {
  const rpcName = isAdmin ? 'get_team_unread_counts_admin' : 'get_team_unread_counts'

  interface UnreadCountRow {
    team_id: string
    team_name: string
    team_color: string
    logo_url: string | null
    unread_count: number | string | null
    last_message: string | null
    last_message_at: string | null
  }

  const { data, error } = await supabase.rpc(rpcName as Parameters<typeof supabase.rpc>[0])
  if (error) {
    // Fallback gracieux si la migration n'est pas encore appliquée
    console.warn('[useChatUnread] RPC non disponible, fallback désactivé:', error.message)
    return []
  }

  return ((data as unknown as UnreadCountRow[]) ?? []).map((row: UnreadCountRow) => ({
    teamId:        row.team_id,
    teamName:      row.team_name,
    teamColor:     row.team_color,
    logo_url:      row.logo_url ?? null,
    unread:        Number(row.unread_count ?? 0),
    lastMessage:   row.last_message ?? null,
    lastMessageAt: row.last_message_at ?? null,
  }))
}

export function useChatUnread(userId?: string, isAdmin = false) {
  return useQuery({
    queryKey: ['chat-unread', userId, isAdmin],
    enabled: !!userId,
    queryFn: () => fetchUnreadCounts(userId!, isAdmin),
    staleTime: 0,
    refetchInterval: 30_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useChatUnreadRealtime — monté une seule fois dans AppLayout
// ─────────────────────────────────────────────────────────────────────────────

export function useChatUnreadRealtime(userId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) return

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const channelName = `chat-unread-rt-${userId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        async (payload) => {
          qc.invalidateQueries({ queryKey: ['chat-unread', userId] })

          const newMsg = payload.new as { sender_id: string; team_id: string; content: string }
          if (newMsg.sender_id === userId) return
          if (document.visibilityState === 'visible') return
          if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

          const [{ data: profile }, { data: team }] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', newMsg.sender_id).single(),
            supabase.from('teams').select('name').eq('id', newMsg.team_id).single(),
          ])

          const profileData = profile as { full_name?: string } | null
          const teamData = team as { name?: string } | null
          const profileName = profileData?.full_name ?? 'Nouveau message'
          const teamName = teamData?.name ?? 'Chat'
          const title = `${profileName} — ${teamName}`;
          const body = newMsg.content.length > 80 ? newMsg.content.slice(0, 80) + '…' : newMsg.content;
          // Utiliser la fonction d'aide pushLocal pour une gestion cohérente des notifications
          pushLocal(title, body, `chat-${newMsg.team_id}`, `/team-chat/${newMsg.team_id}`); // Assumant une route de chat
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_read_receipts' },
        () => qc.invalidateQueries({ queryKey: ['chat-unread', userId] })
      )
      .subscribe((status) => {
        if (status !== 'CLOSED') {
          console.log(`📡 Realtime (${channelName}):`, status)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [userId, qc])
}
