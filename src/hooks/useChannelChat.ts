/**
 * useChannelChat — Chat pour les canaux globaux (Général, Capitaines & Admins)
 * useGlobalChannels — Liste des canaux visibles par l'utilisateur
 * useDmChat — Messages directs entre deux utilisateurs
 * useDmConversations — Liste des conversations DM de l'utilisateur
 */

import { useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobalChannel {
  id: string
  slug: string
  name: string
  description: string | null
  color: string
  icon: string
  is_read_only: boolean
  created_at: string
}

export interface ChannelMessage {
  id: string
  channel_id: string
  sender_id: string
  content: string
  reply_to_id: string | null
  edited_at: string | null
  created_at: string
  sender: { id: string; full_name: string | null; avatar_url: string | null } | null
  reactions: Array<{
    id: string; message_id: string; user_id: string; emoji: string; created_at: string
    profile: { id: string; full_name: string | null } | null
  }>
  reply_to: { id: string; content: string; sender: { id: string; full_name: string | null } | null } | null
}

export interface DmConversation {
  id: string
  user_a: string
  user_b: string
  created_at: string
  other_user: { id: string; full_name: string | null; avatar_url: string | null }
  last_message: string | null
  last_message_at: string | null
  unread: number
}

export interface DmMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  reply_to_id: string | null
  edited_at: string | null
  created_at: string
  sender: { id: string; full_name: string | null; avatar_url: string | null } | null
  reactions: Array<{
    id: string; message_id: string; user_id: string; emoji: string; created_at: string
    profile: { id: string; full_name: string | null } | null
  }>
  reply_to: { id: string; content: string; sender: { id: string; full_name: string | null } | null } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Keys
// ─────────────────────────────────────────────────────────────────────────────

const CHANNELS_KEY        = ['global-channels']
const CHANNEL_MSGS_KEY    = (id: string) => ['channel-messages', id]
const CHANNEL_RECEIPT_KEY = (id: string) => ['channel-receipts', id]
const DM_CONVS_KEY        = (uid: string) => ['dm-conversations', uid]
const DM_MSGS_KEY         = (id: string) => ['dm-messages', id]

// ─────────────────────────────────────────────────────────────────────────────
// useGlobalChannels
// ─────────────────────────────────────────────────────────────────────────────

export function useGlobalChannels(userId?: string, isAdmin = false, isCaptain = false) {
  return useQuery({
    queryKey: [...CHANNELS_KEY, userId, isAdmin, isCaptain],
    enabled: !!userId,
    queryFn: async (): Promise<GlobalChannel[]> => {
      const { data, error } = await supabase
        .from('global_channels')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      // Filtrer le canal capitaines si l'user n'est ni admin ni capitaine
      return (data ?? []).filter(c => {
        if (c.slug === 'captains') return isAdmin || isCaptain
        return true
      }) as GlobalChannel[]
    },
    staleTime: 60_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useChannelChat
// ─────────────────────────────────────────────────────────────────────────────

async function fetchChannelMessages(channelId: string): Promise<ChannelMessage[]> {
  const { data: msgs, error } = await supabase
    .from('channel_messages')
    .select(`
      id, channel_id, sender_id, content, reply_to_id, edited_at, created_at,
      sender:profiles!channel_messages_sender_id_fkey(id, full_name, avatar_url),
      reactions:channel_message_reactions(
        id, message_id, user_id, emoji, created_at,
        profile:profiles!channel_message_reactions_user_id_fkey(id, full_name)
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) throw error
  if (!msgs || msgs.length === 0) return []

  // Résoudre les reply_to
  const replyIds = [...new Set(msgs.map(m => (m as any).reply_to_id).filter(Boolean) as string[])]
  const replyMap = new Map<string, any>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('channel_messages')
      .select('id, content, sender:profiles!channel_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    for (const r of replies ?? []) replyMap.set(r.id, r)
  }

  return msgs.map(m => ({
    ...m,
    reply_to: (m as any).reply_to_id ? (replyMap.get((m as any).reply_to_id) ?? null) : null,
  })) as unknown as ChannelMessage[]
}

export function useChannelChat(channelId?: string, currentUserId?: string) {
  const qc = useQueryClient()
  const lastMarkedRef = useRef<string | null>(null)

  const messagesQuery = useQuery({
    queryKey: CHANNEL_MSGS_KEY(channelId ?? ''),
    enabled: !!channelId,
    queryFn: () => fetchChannelMessages(channelId!),
    staleTime: 0,
  })

  const receiptsQuery = useQuery({
    queryKey: CHANNEL_RECEIPT_KEY(channelId ?? ''),
    enabled: !!channelId,
    queryFn: async () => {
      const { data } = await supabase
        .from('channel_read_receipts')
        .select('user_id, channel_id, last_read_at, last_read_msg, updated_at, profile:profiles!channel_read_receipts_user_id_fkey(id, full_name, avatar_url)')
        .eq('channel_id', channelId!)
      return (data ?? []) as any[]
    },
    staleTime: 0,
  })

  // Realtime
  useEffect(() => {
    if (!channelId) return
    const name = `channel-chat-${channelId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${channelId}` },
        () => qc.refetchQueries({ queryKey: CHANNEL_MSGS_KEY(channelId) }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_message_reactions' },
        () => qc.refetchQueries({ queryKey: CHANNEL_MSGS_KEY(channelId) }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_read_receipts', filter: `channel_id=eq.${channelId}` },
        () => qc.refetchQueries({ queryKey: CHANNEL_RECEIPT_KEY(channelId) }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_channels' },
        () => qc.invalidateQueries({ queryKey: CHANNELS_KEY }))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [channelId, qc])

  const markAsRead = useCallback(async (lastMsgId: string, lastMsgAt: string) => {
    if (!channelId || !currentUserId) return
    if (lastMarkedRef.current === lastMsgId) return
    lastMarkedRef.current = lastMsgId
    await supabase.from('channel_read_receipts').upsert({
      user_id: currentUserId, channel_id: channelId,
      last_read_at: lastMsgAt, last_read_msg: lastMsgId,
    }, { onConflict: 'user_id,channel_id' })
  }, [channelId, currentUserId])

  const sendMessage = useMutation({
    mutationFn: async ({ content, replyToId, senderId }: { content: string; replyToId?: string | null; senderId: string }) => {
      const { error } = await supabase.from('channel_messages').insert({
        channel_id: channelId!, sender_id: senderId,
        content: content.trim(), reply_to_id: replyToId ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: CHANNEL_MSGS_KEY(channelId ?? '') }),
  })

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('channel_messages').delete().eq('id', messageId)
      if (error) throw error
    },
    onMutate: async (messageId) => {
      const key = CHANNEL_MSGS_KEY(channelId ?? '')
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ChannelMessage[]>(key)
      qc.setQueryData<ChannelMessage[]>(key, old => (old ?? []).filter(m => m.id !== messageId))
      return { previous }
    },
    onError: (_e, _id, ctx) => { if (ctx?.previous) qc.setQueryData(CHANNEL_MSGS_KEY(channelId ?? ''), ctx.previous) },
    onSettled: () => qc.refetchQueries({ queryKey: CHANNEL_MSGS_KEY(channelId ?? '') }),
  })

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase.from('channel_messages')
        .update({ content: content.trim(), edited_at: new Date().toISOString() })
        .eq('id', messageId)
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: CHANNEL_MSGS_KEY(channelId ?? '') }),
  })

  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji, userId, hasReacted }: { messageId: string; emoji: string; userId: string; hasReacted: boolean }) => {
      if (hasReacted) {
        const { error } = await supabase.from('channel_message_reactions').delete()
          .eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji)
        if (error) throw error
      } else {
        const { error } = await supabase.from('channel_message_reactions').insert({ message_id: messageId, user_id: userId, emoji })
        if (error) throw error
      }
    },
    onSuccess: () => qc.refetchQueries({ queryKey: CHANNEL_MSGS_KEY(channelId ?? '') }),
  })

  const toggleReadOnly = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from('global_channels').update({ is_read_only: value }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHANNELS_KEY }),
  })

  return {
    messages: messagesQuery.data ?? [],
    receipts: receiptsQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage, deleteMessage, editMessage, toggleReaction, markAsRead, toggleReadOnly,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDmConversations
// ─────────────────────────────────────────────────────────────────────────────

export function useDmConversations(userId?: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: DM_CONVS_KEY(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<DmConversation[]> => {
      const { data: convs, error } = await supabase
        .from('dm_conversations')
        .select(`
          id, user_a, user_b, created_at,
          profile_a:profiles!dm_conversations_user_a_fkey(id, full_name, avatar_url),
          profile_b:profiles!dm_conversations_user_b_fkey(id, full_name, avatar_url)
        `)
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!convs || convs.length === 0) return []

      // Pour chaque conversation, récupérer le dernier message + non-lus
      const results: DmConversation[] = await Promise.all(
        (convs as any[]).map(async (conv) => {
          const isA = conv.user_a === userId
          const other_user = isA ? conv.profile_b : conv.profile_a

          const { data: lastMsgs } = await supabase
            .from('dm_messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)

          const { data: receipt } = await supabase
            .from('dm_read_receipts')
            .select('last_read_at')
            .eq('user_id', userId!)
            .eq('conversation_id', conv.id)
            .maybeSingle()

          let unread = 0
          if (receipt?.last_read_at) {
            const { count } = await supabase
              .from('dm_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', userId!)
              .gt('created_at', receipt.last_read_at)
            unread = count ?? 0
          } else {
            const { count } = await supabase
              .from('dm_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', userId!)
            unread = count ?? 0
          }

          return {
            id: conv.id,
            user_a: conv.user_a,
            user_b: conv.user_b,
            created_at: conv.created_at,
            other_user: other_user ?? { id: '', full_name: 'Joueur', avatar_url: null },
            last_message: lastMsgs?.[0]?.content ?? null,
            last_message_at: lastMsgs?.[0]?.created_at ?? null,
            unread,
          }
        })
      )

      return results.sort((a, b) => {
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime()
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime()
        return tb - ta
      })
    },
    staleTime: 0,
    refetchInterval: 30_000,
  })

  // Realtime
  useEffect(() => {
    if (!userId) return
    const name = `dm-convs-${userId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_messages' },
        () => qc.invalidateQueries({ queryKey: DM_CONVS_KEY(userId) }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_conversations' },
        () => qc.invalidateQueries({ queryKey: DM_CONVS_KEY(userId) }))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId, qc])

  return query
}

// ─────────────────────────────────────────────────────────────────────────────
// useGetOrCreateDm — crée ou récupère une conversation DM
// ─────────────────────────────────────────────────────────────────────────────

export function useGetOrCreateDm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
        other_user_id: otherUserId,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dm-conversations'] }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useDmChat
// ─────────────────────────────────────────────────────────────────────────────

async function fetchDmMessages(conversationId: string): Promise<DmMessage[]> {
  const { data: msgs, error } = await supabase
    .from('dm_messages')
    .select(`
      id, conversation_id, sender_id, content, reply_to_id, edited_at, created_at,
      sender:profiles!dm_messages_sender_id_fkey(id, full_name, avatar_url),
      reactions:dm_message_reactions(
        id, message_id, user_id, emoji, created_at,
        profile:profiles!dm_message_reactions_user_id_fkey(id, full_name)
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) throw error
  if (!msgs || msgs.length === 0) return []

  const replyIds = [...new Set(msgs.map(m => (m as any).reply_to_id).filter(Boolean) as string[])]
  const replyMap = new Map<string, any>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('dm_messages')
      .select('id, content, sender:profiles!dm_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    for (const r of replies ?? []) replyMap.set(r.id, r)
  }

  return msgs.map(m => ({
    ...m,
    reply_to: (m as any).reply_to_id ? (replyMap.get((m as any).reply_to_id) ?? null) : null,
  })) as unknown as DmMessage[]
}

export function useDmChat(conversationId?: string, currentUserId?: string) {
  const qc = useQueryClient()
  const lastMarkedRef = useRef<string | null>(null)

  const messagesQuery = useQuery({
    queryKey: DM_MSGS_KEY(conversationId ?? ''),
    enabled: !!conversationId,
    queryFn: () => fetchDmMessages(conversationId!),
    staleTime: 0,
  })

  useEffect(() => {
    if (!conversationId) return
    const name = `dm-chat-${conversationId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        () => qc.refetchQueries({ queryKey: DM_MSGS_KEY(conversationId) }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_message_reactions' },
        () => qc.refetchQueries({ queryKey: DM_MSGS_KEY(conversationId) }))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [conversationId, qc])

  const markAsRead = useCallback(async (lastMsgId: string, lastMsgAt: string) => {
    if (!conversationId || !currentUserId) return
    if (lastMarkedRef.current === lastMsgId) return
    lastMarkedRef.current = lastMsgId
    await supabase.from('dm_read_receipts').upsert({
      user_id: currentUserId, conversation_id: conversationId,
      last_read_at: lastMsgAt, last_read_msg: lastMsgId,
    }, { onConflict: 'user_id,conversation_id' })
  }, [conversationId, currentUserId])

  const sendMessage = useMutation({
    mutationFn: async ({ content, replyToId, senderId }: { content: string; replyToId?: string | null; senderId: string }) => {
      const { error } = await supabase.from('dm_messages').insert({
        conversation_id: conversationId!, sender_id: senderId,
        content: content.trim(), reply_to_id: replyToId ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: DM_MSGS_KEY(conversationId ?? '') }),
  })

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('dm_messages').delete().eq('id', messageId)
      if (error) throw error
    },
    onMutate: async (messageId) => {
      const key = DM_MSGS_KEY(conversationId ?? '')
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<DmMessage[]>(key)
      qc.setQueryData<DmMessage[]>(key, old => (old ?? []).filter(m => m.id !== messageId))
      return { previous }
    },
    onError: (_e, _id, ctx) => { if (ctx?.previous) qc.setQueryData(DM_MSGS_KEY(conversationId ?? ''), ctx.previous) },
    onSettled: () => qc.refetchQueries({ queryKey: DM_MSGS_KEY(conversationId ?? '') }),
  })

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase.from('dm_messages')
        .update({ content: content.trim(), edited_at: new Date().toISOString() })
        .eq('id', messageId)
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: DM_MSGS_KEY(conversationId ?? '') }),
  })

  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji, userId, hasReacted }: { messageId: string; emoji: string; userId: string; hasReacted: boolean }) => {
      if (hasReacted) {
        const { error } = await supabase.from('dm_message_reactions').delete()
          .eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji)
        if (error) throw error
      } else {
        const { error } = await supabase.from('dm_message_reactions').insert({ message_id: messageId, user_id: userId, emoji })
        if (error) throw error
      }
    },
    onSuccess: () => qc.refetchQueries({ queryKey: DM_MSGS_KEY(conversationId ?? '') }),
  })

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage, deleteMessage, editMessage, toggleReaction, markAsRead,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAllPlayers — liste tous les joueurs pour démarrer un DM
// ─────────────────────────────────────────────────────────────────────────────

export function useAllPlayers(currentUserId?: string) {
  return useQuery({
    queryKey: ['all-players-for-dm', currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .neq('id', currentUserId!)
        .order('full_name', { ascending: true })
      if (error) throw error
      return (data ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null; role: string }>
    },
    staleTime: 60_000,
  })
}
