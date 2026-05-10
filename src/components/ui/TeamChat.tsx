/**
 * TeamChat — Chat de groupe par équipe
 * Délègue tout le rendu à GenericChat, ne gère que la logique métier équipe.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Lock } from 'lucide-react'
import { useTeamChat, useIsTeamMember, useTeamMembers } from '@/hooks/useTeamChat'
import type { ReadReceiptWithProfile } from '@/hooks/useTeamChat'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GenericChat } from '@/components/ui/GenericChat'
import type { GenericMessage, ReadReceiptProfile, MentionMember, PinnedEntry, GroupMember } from '@/components/ui/GenericChat'
import type { TeamMessageFull } from '@/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// Web Push helpers
// ─────────────────────────────────────────────────────────────────────────────

function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const request = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }, [])
  const send = useCallback((title: string, body: string, teamId: string) => {
    if (permission !== 'granted') return
    if (document.visibilityState === 'visible') return
    const n = new Notification(title, {
      body, icon: '/logo-h5.png', badge: '/logo-h5.png',
      tag: `chat-${teamId}`, renotify: true,
    } as NotificationOptions & { renotify?: boolean })
    n.onclick = () => { window.focus(); n.close() }
  }, [permission])
  return { permission, request, send }
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter : TeamMessageFull → GenericMessage
// ─────────────────────────────────────────────────────────────────────────────

function toGenericMessage(m: TeamMessageFull): GenericMessage {
  return {
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at ?? null,
    reply_to_id: (m as any).reply_to_id ?? null,
    sender: m.sender ?? { id: m.sender_id, full_name: null, avatar_url: null },
    reactions: (m.reactions ?? []).map(r => ({
      id: r.id,
      message_id: r.message_id,
      user_id: r.user_id,
      emoji: r.emoji,
      created_at: r.created_at,
      profile: r.profile ?? null,
    })),
    reply_to: (m as any).reply_to ?? null,
  }
}

function toReadReceiptProfile(r: ReadReceiptWithProfile): ReadReceiptProfile {
  return {
    user_id: r.user_id,
    last_read_msg: r.last_read_msg ?? null,
    profile: r.profile,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamChat
// ─────────────────────────────────────────────────────────────────────────────

interface TeamChatProps {
  teamId: string
  teamColor?: string
  teamName?: string
  embedded?: boolean
}

export function TeamChat({ teamId, teamColor, teamName, embedded = false }: TeamChatProps) {
  const { user, isAdmin } = useAuth()
  const { data: isMember, isLoading: memberLoading } = useIsTeamMember(teamId, user?.id)
  const { data: teamMembers = [] } = useTeamMembers(teamId)
  const {
    messages, receipts, pinned, typing, isLoading,
    sendMessage, deleteMessage, clearChat, toggleReaction,
    markAsRead, editMessage, setTyping, clearTyping, pinMessage, unpinMessage,
    olderCount, isLoadingOlder, loadOlder,
  } = useTeamChat(teamId, user?.id)
  const push = usePushNotifications()

  // Récupérer le captain_id pour marquer le rôle dans le panneau membres
  const [captainId, setCaptainId] = useState<string | null>(null)
  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('teams').select('captain_id').eq('id', teamId).maybeSingle()
        .then(({ data }) => setCaptainId(data?.captain_id ?? null))
    })
  }, [teamId])

  // ── Calcul premier message non lu ────────────────────────────────────────
  const myReceipt = useMemo(() => receipts.find(r => r.user_id === user?.id), [receipts, user?.id])
  const firstUnreadIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (firstUnreadIdRef.current !== undefined) return
    if (isLoading || messages.length === 0) return
    if (!myReceipt) {
      firstUnreadIdRef.current = messages[0]?.id ?? null
    } else {
      const firstUnread = messages.find(
        m => m.created_at > myReceipt.last_read_at && m.sender_id !== user?.id
      )
      firstUnreadIdRef.current = firstUnread?.id ?? null
    }
  }, [isLoading, messages, myReceipt, user?.id])

  const unreadCount = useMemo(() => {
    if (!firstUnreadIdRef.current || messages.length === 0) return 0
    const idx = messages.findIndex(m => m.id === firstUnreadIdRef.current)
    return idx === -1 ? 0 : messages.length - idx
  }, [messages])

  // ── Push notifications sur nouveaux messages ──────────────────────────────
  const prevMessagesRef = useRef<TeamMessageFull[]>([])
  useEffect(() => {
    const prev = prevMessagesRef.current
    if (prev.length > 0 && messages.length > prev.length) {
      const newMsgs = messages.slice(prev.length)
      for (const m of newMsgs) {
        if (m.sender_id !== user?.id) {
          push.send(
            `${m.sender?.full_name ?? 'Joueur'} — ${teamName ?? 'Équipe'}`,
            m.content.length > 60 ? m.content.slice(0, 60) + '…' : m.content,
            teamId
          )
        }
      }
    }
    prevMessagesRef.current = messages
  }, [messages, user?.id, push, teamId, teamName])

  // ── Adapters ──────────────────────────────────────────────────────────────
  const genericMessages = useMemo(() => messages.map(toGenericMessage), [messages])

  const genericReceipts = useMemo(
    () => receipts.map(toReadReceiptProfile),
    [receipts]
  )

  const mentionMembers: MentionMember[] = useMemo(
    () => teamMembers.map(m => ({ id: m.id, full_name: m.full_name, avatar_url: m.avatar_url })),
    [teamMembers]
  )

  // Membres enrichis avec rôle pour le panneau membres
  const groupMembers: GroupMember[] = useMemo(
    () => teamMembers.map(m => ({
      id: m.id,
      full_name: m.full_name,
      avatar_url: m.avatar_url,
      role: isAdmin && m.id === user?.id
        ? 'admin'
        : m.id === captainId
        ? 'captain'
        : 'player',
    })),
    [teamMembers, captainId, isAdmin, user?.id]
  )

  const pinnedEntries: PinnedEntry[] = useMemo(
    () => pinned.map(p => ({
      id: p.id,
      content: p.content,
      sender: p.sender ? { full_name: p.sender.full_name } : null,
    })),
    [pinned]
  )

  const typingOthers = useMemo(
    () => (typing ?? []).filter(t => t.user_id !== user?.id),
    [typing, user?.id]
  )

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!user) return (
    <div className="card flex flex-col items-center justify-center py-10 gap-3 text-center">
      <Lock size={24} className="text-slate-500" />
      <p className="text-slate-400 text-sm">Connectez-vous pour accéder au chat.</p>
    </div>
  )

  if (memberLoading) return (
    <div className="card flex justify-center py-10"><LoadingSpinner size="md" /></div>
  )

  if (!isMember && !isAdmin) return (
    <div className="card flex flex-col items-center justify-center py-10 gap-3 text-center">
      <Lock size={24} className="text-slate-500" />
      <p className="text-slate-400 text-sm font-medium">Chat réservé aux membres de l'équipe</p>
      <p className="text-slate-600 text-xs">Seuls les joueurs et le capitaine peuvent accéder à ce groupe.</p>
    </div>
  )

  return (
    <GenericChat
      // Messages
      messages={genericMessages}
      currentUserId={user.id}
      isAdmin={isAdmin}
      isReadOnly={false}
      isLoading={isLoading}

      // Actions
      onSend={(content, replyToId) =>
        sendMessage.mutateAsync({ content, replyToId, senderId: user.id })
      }
      onDelete={id => deleteMessage.mutateAsync(id)}
      onEdit={(id, content) => editMessage.mutateAsync({ messageId: id, content })}
      onReact={(messageId, emoji, hasReacted) =>
        toggleReaction.mutateAsync({ messageId, emoji, userId: user.id, hasReacted })
      }
      onMarkAsRead={markAsRead}

      // Header
      headerTitle={teamName ?? "Chat d'équipe"}
      headerColor={teamColor ?? '#16a34a'}
      headerIcon={teamName ? teamName[0].toUpperCase() : '💬'}
      headerOnline
      memberCount={teamMembers.length}
      messageCount={messages.length}
      embedded={embedded}

      // Read receipts
      readReceipts={genericReceipts}

      // Typing
      typingUsers={typingOthers}
      onTypingStart={setTyping}
      onTypingStop={clearTyping}

      // Mentions
      mentionMembers={mentionMembers}

      // Membres (panneau)
      groupMembers={groupMembers}

      // Pinned
      pinnedMessages={pinnedEntries}
      onPin={isAdmin ? id => pinMessage.mutateAsync(id) : undefined}
      onUnpin={isAdmin ? id => unpinMessage.mutateAsync(id) : undefined}

      // Clear chat
      onClearChat={isAdmin ? () => clearChat.mutateAsync() : undefined}
      isClearingChat={clearChat.isPending}

      // Push
      pushPermission={push.permission}
      onRequestPush={push.request}

      // Non-lus
      firstUnreadId={firstUnreadIdRef.current ?? undefined}
      unreadCount={unreadCount}

      // Pagination
      olderCount={olderCount}
      isLoadingOlder={isLoadingOlder}
      onLoadOlder={loadOlder}
      emptyContext="team"
    />
  )
}
