/**
 * useChatUnread
 *
 * Calcule le nombre de messages non lus par équipe pour l'utilisateur courant.
 * Utilisé pour afficher les badges dans le ChatPanel et l'icône du header.
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

async function fetchUnreadCounts(userId: string, isAdmin: boolean = false): Promise<TeamUnread[]> {
  let teamsMap = new Map<string, { teamId: string; teamName: string; teamColor: string; logo_url: string | null }>()

  if (isAdmin) {
    // Admin voit TOUTES les équipes
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name, color, logo_url')
    
    for (const t of allTeams ?? []) {
      teamsMap.set(t.id, { teamId: t.id, teamName: t.name, teamColor: t.color, logo_url: t.logo_url })
    }
  } else {
    // 1. Équipes dont l'user est membre (joueur actif ou capitaine)
    const [{ data: playerTeams }, { data: captainTeams }] = await Promise.all([
      supabase
        .from('players')
        .select('team_id, teams!players_team_id_fkey(id, name, color, logo_url)')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('teams')
        .select('id, name, color, logo_url')
        .eq('captain_id', userId),
    ])

    for (const row of playerTeams ?? []) {
      const t = row.teams as unknown as { id: string; name: string; color: string; logo_url: string | null } | null
      if (t) teamsMap.set(t.id, { teamId: t.id, teamName: t.name, teamColor: t.color, logo_url: t.logo_url })
    }
    for (const t of captainTeams ?? []) {
      teamsMap.set(t.id, { teamId: t.id, teamName: t.name, teamColor: t.color, logo_url: t.logo_url })
    }
  }

  if (teamsMap.size === 0) return []

  const teamIds = [...teamsMap.keys()]

  // 2. Read receipts de l'user pour ces équipes
  const { data: receipts } = await supabase
    .from('chat_read_receipts')
    .select('team_id, last_read_at')
    .eq('user_id', userId)
    .in('team_id', teamIds)

  const receiptMap = new Map<string, string>()
  for (const r of receipts ?? []) receiptMap.set(r.team_id, r.last_read_at)

  // 3. Pour chaque équipe, compter les messages non lus + dernier message
  const results: TeamUnread[] = []

  await Promise.all(
    teamIds.map(async (teamId) => {
      const lastReadAt = receiptMap.get(teamId)
      const team = teamsMap.get(teamId)!

      // Dernier message
      const { data: lastMsgs } = await supabase
        .from('team_messages')
        .select('content, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)

      const lastMsg = lastMsgs?.[0] ?? null

      // Compter les non-lus (messages après last_read_at, pas de l'user)
      let unread = 0
      if (lastReadAt) {
        const { count } = await supabase
          .from('team_messages')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .neq('sender_id', userId)
          .gt('created_at', lastReadAt)
        unread = count ?? 0
      } else {
        // Jamais ouvert : tous les messages des autres sont non lus
        const { count } = await supabase
          .from('team_messages')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .neq('sender_id', userId)
        unread = count ?? 0
      }

      results.push({
        ...team,
        unread,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.created_at ?? null,
      })
    })
  )

  // Trier par date du dernier message (plus récent en premier)
  return results.sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return timeB - timeA
  })
}

export function useChatUnread(userId?: string, isAdmin: boolean = false) {
  return useQuery({
    queryKey: ['chat-unread', userId, isAdmin],
    enabled: !!userId,
    queryFn: () => fetchUnreadCounts(userId!, isAdmin),
    staleTime: 0,
    refetchInterval: 30_000,
  })
}

/**
 * useChatUnreadRealtime
 * À monter UNE SEULE FOIS dans AppLayout.
 * Gère les notifications globales et l'invalidation des compteurs.
 */
export function useChatUnreadRealtime(userId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) return

    // 1. Demander la permission de notification automatiquement
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // 2. Écouter les nouveaux messages pour envoyer des notifications
    const channelName = `chat-unread-rt-${userId}`
    supabase.removeChannel(supabase.channel(channelName))

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        async (payload) => {
          // Invalider les compteurs pour rafraîchir l'UI
          qc.invalidateQueries({ queryKey: ['chat-unread', userId] })

          const newMsg = payload.new as { sender_id: string; team_id: string; content: string }
          
          // Ne pas notifier si c'est notre propre message
          if (newMsg.sender_id === userId) return

          // Ne pas notifier si l'onglet est visible (l'utilisateur est déjà en train de lire)
          if (document.visibilityState === 'visible') return

          // Vérifier la permission
          if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

          // Récupérer les infos pour la notification (nom du sender et de l'équipe)
          const [{ data: profile }, { data: team }] = await Promise.all([
            supabase.from('profiles').select('full_name').eq('id', newMsg.sender_id).single(),
            supabase.from('teams').select('name').eq('id', newMsg.team_id).single()
          ])

          const title = `${profile?.full_name ?? 'Nouveau message'} — ${team?.name ?? 'Chat'}`
          const body = newMsg.content.length > 80 ? newMsg.content.slice(0, 80) + '…' : newMsg.content

          new Notification(title, {
            body,
            icon: '/logo-h5.png',
            badge: '/logo-h5.png',
            tag: `chat-${newMsg.team_id}`,
            renotify: true,
          } as NotificationOptions & { renotify?: boolean })
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_read_receipts' },
        () => qc.invalidateQueries({ queryKey: ['chat-unread', userId] })
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, qc])
}
