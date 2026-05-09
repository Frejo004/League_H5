/**
 * useTeamChat
 *
 * - Messages avec sender, réactions, reply
 * - Envoi / suppression optimiste / réactions
 * - Read receipts : marque le dernier message lu, expose les receipts des autres
 * - Realtime sur messages + réactions + read receipts
 * - Typing indicators, pinned messages
 * - useIsTeamMember : vérifie l'appartenance à l'équipe
 */

import { useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TeamMessageFull, ChatReadReceipt } from '@/types/database'

const MESSAGES_KEY  = (teamId: string) => ['team-chat', 'messages', teamId]
const RECEIPTS_KEY  = (teamId: string) => ['team-chat', 'receipts', teamId]
const PINNED_KEY    = (teamId: string) => ['team-chat', 'pinned', teamId]
const TYPING_KEY    = (teamId: string) => ['team-chat', 'typing', teamId]
const PAGE_SIZE = 100

// ─────────────────────────────────────────────────────────────────────────────
// Fetch messages
// ─────────────────────────────────────────────────────────────────────────────

async function fetchMessages(teamId: string): Promise<TeamMessageFull[]> {
  const { data: msgs, error } = await supabase
    .from('team_messages')
    .select(`
      id, team_id, sender_id, content, reply_to_id, edited_at, created_at,
      sender:profiles!team_messages_sender_id_fkey (id, full_name, avatar_url),
      reactions:team_message_reactions (
        id, message_id, user_id, emoji, created_at,
        profile:profiles!team_message_reactions_user_id_fkey (id, full_name)
      )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })
    .limit(PAGE_SIZE)

  if (error) throw error
  if (!msgs || msgs.length === 0) return []

  // Résoudre les reply_to séparément (auto-jointure non supportée par PostgREST)
  const replyIds = [...new Set(
    msgs.map(m => (m as any).reply_to_id).filter(Boolean) as string[]
  )]
  const replyMap = new Map<string, any>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('team_messages')
      .select('id, content, sender:profiles!team_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    for (const r of replies ?? []) replyMap.set(r.id, r)
  }

  return msgs.map(m => ({
    ...m,
    reply_to: (m as any).reply_to_id ? (replyMap.get((m as any).reply_to_id) ?? null) : null,
  })) as unknown as TeamMessageFull[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch read receipts
// ─────────────────────────────────────────────────────────────────────────────

export type ReadReceiptWithProfile = ChatReadReceipt & {
  profile: { id: string; full_name: string | null; avatar_url: string | null }
}

async function fetchReceipts(teamId: string): Promise<ReadReceiptWithProfile[]> {
  const { data, error } = await supabase
    .from('chat_read_receipts')
    .select('user_id, team_id, last_read_at, last_read_msg, updated_at, profile:profiles!chat_read_receipts_user_id_fkey(id, full_name, avatar_url)')
    .eq('team_id', teamId)
  if (error) throw error
  return (data ?? []) as unknown as ReadReceiptWithProfile[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch pinned messages
// ─────────────────────────────────────────────────────────────────────────────

export type PinnedMessage = TeamMessageFull & {
  pinned_at: string
  pinned_by: string
}

async function fetchPinnedMessages(teamId: string): Promise<PinnedMessage[]> {
  const { data, error } = await supabase
    .from('team_pinned_messages')
    .select(`
      pinned_at, pinned_by, message_id,
      message:team_messages!inner (
        id, team_id, sender_id, content, reply_to_id, edited_at, created_at,
        sender:profiles!team_messages_sender_id_fkey (id, full_name, avatar_url),
        reactions:team_message_reactions (
          id, message_id, user_id, emoji, created_at,
          profile:profiles!team_message_reactions_user_id_fkey (id, full_name)
        )
      )
    `)
    .eq('team_id', teamId)
    .order('pinned_at', { ascending: false })

  if (error) throw error
  if (!data) return []

  // Résoudre les reply_to
  const replyIds = [...new Set(
    (data as any[]).map((p: any) => p.message?.reply_to_id).filter(Boolean) as string[]
  )]
  const replyMap = new Map<string, any>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('team_messages')
      .select('id, content, sender:profiles!team_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    for (const r of replies ?? []) replyMap.set(r.id, r)
  }

  return (data as any[]).map((p: any) => ({
    ...p.message,
    reply_to: p.message?.reply_to_id ? (replyMap.get(p.message.reply_to_id) ?? null) : null,
    pinned_at: p.pinned_at,
    pinned_by: p.pinned_by,
  })) as PinnedMessage[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch typing users
// ─────────────────────────────────────────────────────────────────────────────

export type TypingUser = {
  user_id: string
  profile: { id: string; full_name: string | null; avatar_url: string | null }
}

async function fetchTypingUsers(teamId: string): Promise<TypingUser[]> {
  const { data, error } = await supabase
    .from('chat_typing')
    .select('user_id, profile:profiles!chat_typing_user_id_fkey(id, full_name, avatar_url)')
    .eq('team_id', teamId)
    .gt('started_at', new Date(Date.now() - 30000).toISOString()) // 30 secondes max
  if (error) throw error
  return (data ?? []) as unknown as TypingUser[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function useTeamChat(teamId?: string, currentUserId?: string) {
  const qc = useQueryClient()
  // Ref pour éviter de spammer les upserts de read receipt
  const lastMarkedRef = useRef<string | null>(null)

  // ── Messages ──────────────────────────────────────────────────────────────
  const messagesQuery = useQuery({
    queryKey: MESSAGES_KEY(teamId ?? ''),
    enabled: !!teamId,
    queryFn: () => fetchMessages(teamId!),
    staleTime: 0,
  })

  // ── Read receipts ─────────────────────────────────────────────────────────
  const receiptsQuery = useQuery({
    queryKey: RECEIPTS_KEY(teamId ?? ''),
    enabled: !!teamId,
    queryFn: () => fetchReceipts(teamId!),
    staleTime: 0,
  })

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return

    // Nom unique avec timestamp pour éviter tout conflit si le hook
    // est remonté rapidement (StrictMode, navigation, etc.)
    const channelName = `team-chat-${teamId}`

    // Supprimer un éventuel channel zombie du même nom avant d'en créer un
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
    if (existing) supabase.removeChannel(existing)

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
        () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId) })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_message_reactions' },
        () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId) })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_read_receipts', filter: `team_id=eq.${teamId}` },
        () => qc.refetchQueries({ queryKey: RECEIPTS_KEY(teamId) })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_pinned_messages', filter: `team_id=eq.${teamId}` },
        () => qc.refetchQueries({ queryKey: PINNED_KEY(teamId) })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_typing', filter: `team_id=eq.${teamId}` },
        () => qc.refetchQueries({ queryKey: TYPING_KEY(teamId) })
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log(`[TeamChat] ${status}`)
      })

    return () => { supabase.removeChannel(channel) }
  }, [teamId, qc])

  // ── Pinned messages query ─────────────────────────────────────────────────
  const pinnedQuery = useQuery({
    queryKey: PINNED_KEY(teamId ?? ''),
    enabled: !!teamId,
    queryFn: () => fetchPinnedMessages(teamId!),
    staleTime: 0,
  })

  // ── Typing users query ───────────────────────────────────────────────────
  const typingQuery = useQuery({
    queryKey: TYPING_KEY(teamId ?? ''),
    enabled: !!teamId,
    queryFn: () => fetchTypingUsers(teamId!),
    staleTime: 5000,
    refetchInterval: 3000,
  })

  // ── Mark as read ──────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (lastMsgId: string, lastMsgAt: string) => {
    if (!teamId || !currentUserId) return
    if (lastMarkedRef.current === lastMsgId) return
    lastMarkedRef.current = lastMsgId

    await supabase
      .from('chat_read_receipts')
      .upsert({
        user_id: currentUserId,
        team_id: teamId,
        last_read_at: lastMsgAt,
        last_read_msg: lastMsgId,
      }, { onConflict: 'user_id,team_id' })
  }, [teamId, currentUserId])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async ({ content, replyToId, senderId }: { content: string; replyToId?: string | null; senderId: string }) => {
      const { error } = await supabase.from('team_messages').insert({
        team_id: teamId!,
        sender_id: senderId,
        content: content.trim(),
        reply_to_id: replyToId ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId ?? '') }),
  })

  // ── Delete message (optimiste) ────────────────────────────────────────────
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('team_messages').delete().eq('id', messageId)
      if (error) throw error
    },
    onMutate: async (messageId) => {
      const key = MESSAGES_KEY(teamId ?? '')
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TeamMessageFull[]>(key)
      qc.setQueryData<TeamMessageFull[]>(key, old => (old ?? []).filter(m => m.id !== messageId))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(MESSAGES_KEY(teamId ?? ''), context.previous)
    },
    onSettled: () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId ?? '') }),
  })

  // ── Toggle reaction ───────────────────────────────────────────────────────
  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji, userId, hasReacted }: { messageId: string; emoji: string; userId: string; hasReacted: boolean }) => {
      if (hasReacted) {
        const { error } = await supabase.from('team_message_reactions').delete()
          .eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji)
        if (error) throw error
      } else {
        const { error } = await supabase.from('team_message_reactions').insert({ message_id: messageId, user_id: userId, emoji })
        if (error) throw error
      }
    },
    onSuccess: () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId ?? '') }),
  })

  // ── Edit message ───────────────────────────────────────────────────────────
  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase.from('team_messages')
        .update({ content: content.trim(), edited_at: new Date().toISOString() })
        .eq('id', messageId)
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId ?? '') }),
  })

  // ── Set typing indicator ─────────────────────────────────────────────────
  const setTyping = useCallback(async () => {
    if (!teamId || !currentUserId) return
    await supabase.from('chat_typing').upsert({
      user_id: currentUserId,
      team_id: teamId,
      started_at: new Date().toISOString(),
    }, { onConflict: 'user_id,team_id' })
  }, [teamId, currentUserId])

  // ── Clear typing indicator ───────────────────────────────────────────────
  const clearTyping = useCallback(async () => {
    if (!teamId || !currentUserId) return
    await supabase.from('chat_typing').delete()
      .eq('user_id', currentUserId)
      .eq('team_id', teamId)
  }, [teamId, currentUserId])

  // ── Pin message ───────────────────────────────────────────────────────────
  const pinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!teamId || !currentUserId) return
      const { error } = await supabase.from('team_pinned_messages').insert({
        team_id: teamId,
        message_id: messageId,
        pinned_by: currentUserId,
      })
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: PINNED_KEY(teamId ?? '') }),
  })

  // ── Unpin message ─────────────────────────────────────────────────────────
  const unpinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!teamId) return
      const { error } = await supabase.from('team_pinned_messages')
        .delete()
        .eq('team_id', teamId)
        .eq('message_id', messageId)
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: PINNED_KEY(teamId ?? '') }),
  })

  // ── Clear chat (admin only) ──────────────────────────────────────────────
  const clearChat = useMutation({
    mutationFn: async () => {
      if (!teamId) return
      const { error } = await supabase.from('team_messages').delete().eq('team_id', teamId)
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId ?? '') }),
  })

  return {
    messages:   messagesQuery.data ?? [],
    receipts:   receiptsQuery.data ?? [],
    pinned:     pinnedQuery.data ?? [],
    typing:     typingQuery.data ?? [],
    isLoading:  messagesQuery.isLoading,
    isError:    messagesQuery.isError,
    sendMessage,
    deleteMessage,
    clearChat,
    toggleReaction,
    editMessage,
    markAsRead,
    setTyping,
    clearTyping,
    pinMessage,
    unpinMessage,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useIsTeamMember
// ─────────────────────────────────────────────────────────────────────────────

export function useIsTeamMember(teamId?: string, userId?: string) {
  return useQuery({
    queryKey: ['team-member', teamId, userId],
    enabled: !!teamId && !!userId,
    queryFn: async () => {
      const { data: player } = await supabase.from('players').select('id')
        .eq('team_id', teamId!).eq('user_id', userId!).eq('is_active', true).maybeSingle()
      if (player) return true
      const { data: team } = await supabase.from('teams').select('captain_id').eq('id', teamId!).maybeSingle()
      if (team?.captain_id === userId) return true
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId!).maybeSingle()
      return profile?.role === 'admin'
    },
    staleTime: 60_000,
  })
}
