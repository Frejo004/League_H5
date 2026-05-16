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

  const { data, error } = await supabase.rpc(rpcName as any)
  if (error) {
    // Fallback gracieux si la migration n'est pas encore appliquée
    console.warn('[useChatUnread] RPC non disponible, fallback désactivé:', error.message)
    return []
  }

  return (data ?? []).map((row: any) => ({
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

          const title = `${profile?.full_name ?? 'Nouveau message'} — ${team?.name ?? 'Chat'}`
          const body = newMsg.content.length > 80 ? newMsg.content.slice(0, 80) + '…' : newMsg.content

          new Notification(title, {
            body, icon: '/logo-h5.png', badge: '/logo-h5.png',
            tag: `chat-${newMsg.team_id}`, renotify: true,
          } as NotificationOptions & { renotify?: boolean })
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
