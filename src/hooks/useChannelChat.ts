/**
 * useChannelChat  — canaux globaux (Général, Capitaines & Admins)
 * useGlobalChannels — liste des canaux visibles
 * useDmChat       — messages directs avec pagination cursor-based
 * useDmConversations — liste DMs via RPC (1 requête au lieu de N+1)
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { saveMentions } from '@/hooks/useTeamChat'

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
  last_message: string | null
  last_message_at: string | null
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
// Query keys
// ─────────────────────────────────────────────────────────────────────────────

const CHANNELS_KEY        = ['global-channels']
const CHANNEL_MSGS_KEY    = (id: string) => ['channel-messages', id]
const CHANNEL_RECEIPT_KEY = (id: string) => ['channel-receipts', id]
const DM_CONVS_KEY        = (uid: string) => ['dm-conversations', uid]
const DM_MSGS_KEY         = (id: string) => ['dm-messages', id]

const PAGE_SIZE = 50

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ReplyRow {
  id: string
  content: string
  sender: { id: string; full_name: string | null } | null
}

type ChannelReceiptWithProfile = Database['public']['Tables']['channel_read_receipts']['Row'] & {
  profile: { id: string; full_name: string | null; avatar_url: string | null } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// useGlobalChannels
// ─────────────────────────────────────────────────────────────────────────────

export function useGlobalChannels(userId?: string, isAdmin = false, isCaptain = false) {
  const qc = useQueryClient()
  const key = [...CHANNELS_KEY, userId, isAdmin, isCaptain]

  // Invalider les previews quand un message arrive dans un canal
  useEffect(() => {
    if (!userId) return
    const name = `channel-previews-${userId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channel_messages' },
        () => qc.invalidateQueries({ queryKey: CHANNELS_KEY }))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId, qc])

  return useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async (): Promise<GlobalChannel[]> => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_channel_previews')

      let rows: GlobalChannel[]
      if (rpcError || !rpcData) {
        const { data, error } = await supabase
          .from('global_channels')
          .select('*')
          .order('created_at', { ascending: true })
        if (error) throw error
        rows = (data ?? []).map(r => ({ ...r, last_message: null, last_message_at: null }))
      } else {
        rows = rpcData
      }

      return rows.filter(c => {
        if (c.slug === 'captains') return isAdmin || isCaptain
        return true
      }) as GlobalChannel[]
    },
    staleTime: 0,
    refetchInterval: 30_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useChannelChat — avec pagination cursor-based
// ─────────────────────────────────────────────────────────────────────────────

async function fetchChannelPage(channelId: string, beforeId?: string): Promise<ChannelMessage[]> {
  let query = supabase
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
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (beforeId) {
    const { data: pivot } = await supabase
      .from('channel_messages').select('created_at').eq('id', beforeId).single()
    if (pivot) query = query.lt('created_at', pivot.created_at)
  }

  const { data: msgs, error } = await query
  if (error) throw error
  if (!msgs || msgs.length === 0) return []

  const messages = msgs as unknown as ChannelMessage[]
  const replyIds = [...new Set(messages.map(m => m.reply_to_id).filter(Boolean) as string[])]
  const replyMap = new Map<string, ReplyRow>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('channel_messages')
      .select('id, content, sender:profiles!channel_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    const replyRows = replies as unknown as ReplyRow[] | null
    for (const r of replyRows ?? []) replyMap.set(r.id, r)
  }

  return messages
    .map(m => ({ ...m, reply_to: m.reply_to_id ? (replyMap.get(m.reply_to_id) ?? null) : null }))
    .reverse()
}

export function useChannelChat(channelId?: string, currentUserId?: string) {
  const qc = useQueryClient()
  const lastMarkedRef = useRef<string | null>(null)
  const [olderCount, setOlderCount] = useState(0)

  // Page courante (les 50 derniers)
  const messagesQuery = useQuery({
    queryKey: CHANNEL_MSGS_KEY(channelId ?? ''),
    enabled: !!channelId,
    queryFn: () => fetchChannelPage(channelId!),
    staleTime: 0,
  })

  // Pages plus anciennes (chargées à la demande)
  const [olderPages, setOlderPages] = useState<ChannelMessage[][]>([])
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)

  const loadOlder = useCallback(async () => {
    if (!channelId || isLoadingOlder) return
    const allMsgs = [...(olderPages.flat()), ...(messagesQuery.data ?? [])]
    const oldest = allMsgs[0]
    if (!oldest) return
    setIsLoadingOlder(true)
    try {
      const page = await fetchChannelPage(channelId, oldest.id)
      if (page.length > 0) {
        setOlderPages(prev => [page, ...prev])
        // Compter combien il en reste
        const { data } = await supabase.rpc('count_channel_messages_before', {
          p_channel_id: channelId,
          p_before_id: page[0].id,
        })
        setOlderCount(Number(data ?? 0))
      } else {
        setOlderCount(0)
      }
    } finally {
      setIsLoadingOlder(false)
    }
  }, [channelId, isLoadingOlder, olderPages, messagesQuery.data])

  // Initialiser le compteur de messages plus anciens
  useEffect(() => {
    if (!channelId || !messagesQuery.data?.length) return
    const first = messagesQuery.data[0]
    supabase.rpc('count_channel_messages_before', {
      p_channel_id: channelId,
      p_before_id: first.id,
    }).then(({ data }) => setOlderCount(Number(data ?? 0)))
  }, [channelId, messagesQuery.data])

  // Reset pages anciennes quand on change de canal
  useEffect(() => {
    queueMicrotask(() => {
      setOlderPages([])
      setOlderCount(0)
    })
  }, [channelId])

  const receiptsQuery = useQuery({
    queryKey: CHANNEL_RECEIPT_KEY(channelId ?? ''),
    enabled: !!channelId,
    queryFn: async () => {
      const { data } = await supabase
        .from('channel_read_receipts')
        .select('user_id, channel_id, last_read_at, last_read_msg, updated_at, profile:profiles!channel_read_receipts_user_id_fkey(id, full_name, avatar_url)')
        .eq('channel_id', channelId!)
      return (data ?? []) as unknown as ChannelReceiptWithProfile[]
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
      const { data: newMsg, error } = await supabase.from('channel_messages').insert({
        channel_id: channelId!, sender_id: senderId,
        content: content.trim(), reply_to_id: replyToId ?? null,
      }).select('id').single()
      if (error) throw error

      // Enregistrer les mentions @
      if (newMsg?.id) {
        await saveMentions(content, newMsg.id, senderId, 'channel', channelId!)
      }
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

  // Messages fusionnés : pages anciennes + page courante
  const allMessages = [...olderPages.flat(), ...(messagesQuery.data ?? [])]

  return {
    messages: allMessages,
    receipts: receiptsQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    olderCount,
    isLoadingOlder,
    loadOlder,
    sendMessage, deleteMessage, editMessage, toggleReaction, markAsRead, toggleReadOnly,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDmConversations — via RPC (1 requête au lieu de N+1)
// ─────────────────────────────────────────────────────────────────────────────

export function useDmConversations(userId?: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: DM_CONVS_KEY(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<DmConversation[]> => {
      const { data, error } = await supabase.rpc('get_dm_conversations_with_unread')

      if (error) {
        // Fallback si la migration n'est pas encore appliquée
        console.warn('[useDmConversations] RPC non disponible:', error.message)
        return []
      }

      return (data ?? []).map((row: Database['public']['Functions']['get_dm_conversations_with_unread']['Returns'][number]) => ({
        id:             row.id,
        user_a:         row.user_a,
        user_b:         row.user_b,
        created_at:     row.created_at,
        other_user: {
          id:         row.other_id,
          full_name:  row.other_full_name ?? null,
          avatar_url: row.other_avatar ?? null,
        },
        last_message:    row.last_message ?? null,
        last_message_at: row.last_message_at ?? null,
        unread:          Number(row.unread_count ?? 0),
      }))
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_read_receipts' },
        () => qc.invalidateQueries({ queryKey: DM_CONVS_KEY(userId) }))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId, qc])

  return query
}

// ─────────────────────────────────────────────────────────────────────────────
// useGetOrCreateDm
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
// useDmChat — avec pagination cursor-based
// ─────────────────────────────────────────────────────────────────────────────

async function fetchDmPage(conversationId: string, beforeId?: string): Promise<DmMessage[]> {
  let query = supabase
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
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (beforeId) {
    const { data: pivot } = await supabase
      .from('dm_messages').select('created_at').eq('id', beforeId).single()
    if (pivot) query = query.lt('created_at', pivot.created_at)
  }

  const { data: msgs, error } = await query
  if (error) throw error
  if (!msgs || msgs.length === 0) return []

  const messages = msgs as unknown as DmMessage[]
  const replyIds = [...new Set(messages.map(m => m.reply_to_id).filter(Boolean) as string[])]
  const replyMap = new Map<string, ReplyRow>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('dm_messages')
      .select('id, content, sender:profiles!dm_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    const replyRows = replies as unknown as ReplyRow[] | null
    for (const r of replyRows ?? []) replyMap.set(r.id, r)
  }

  return messages
    .map(m => ({ ...m, reply_to: m.reply_to_id ? (replyMap.get(m.reply_to_id) ?? null) : null }))
    .reverse()
}

export function useDmChat(conversationId?: string, currentUserId?: string) {
  const qc = useQueryClient()
  const lastMarkedRef = useRef<string | null>(null)
  const [olderPages, setOlderPages] = useState<DmMessage[][]>([])
  const [olderCount, setOlderCount] = useState(0)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)

  const messagesQuery = useQuery({
    queryKey: DM_MSGS_KEY(conversationId ?? ''),
    enabled: !!conversationId,
    queryFn: () => fetchDmPage(conversationId!),
    staleTime: 0,
  })

  const loadOlder = useCallback(async () => {
    if (!conversationId || isLoadingOlder) return
    const allMsgs = [...olderPages.flat(), ...(messagesQuery.data ?? [])]
    const oldest = allMsgs[0]
    if (!oldest) return
    setIsLoadingOlder(true)
    try {
      const page = await fetchDmPage(conversationId, oldest.id)
      if (page.length > 0) {
        setOlderPages(prev => [page, ...prev])
        const { data } = await supabase.rpc('count_dm_messages_before', {
          p_conversation_id: conversationId,
          p_before_id: page[0].id,
        })
        setOlderCount(Number(data ?? 0))
      } else {
        setOlderCount(0)
      }
    } finally {
      setIsLoadingOlder(false)
    }
  }, [conversationId, isLoadingOlder, olderPages, messagesQuery.data])

  useEffect(() => {
    if (!conversationId || !messagesQuery.data?.length) return
    const first = messagesQuery.data[0]
    supabase.rpc('count_dm_messages_before', {
      p_conversation_id: conversationId,
      p_before_id: first.id,
    }).then(({ data }) => setOlderCount(Number(data ?? 0)))
  }, [conversationId, messagesQuery.data])

  useEffect(() => {
    queueMicrotask(() => {
      setOlderPages([])
      setOlderCount(0)
    })
  }, [conversationId])

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
    // TODO: Envisager de débouncer/limiter cette fonction pour réduire les écritures en base de données lors d'un défilement rapide.
    if (!conversationId || !currentUserId) return;
    if (lastMarkedRef.current === lastMsgId) return;
    lastMarkedRef.current = lastMsgId;
    await supabase.from('dm_read_receipts').upsert(
      {
        user_id: currentUserId, conversation_id: conversationId,
        last_read_at: lastMsgAt, last_read_msg: lastMsgId,
      },
      { onConflict: 'user_id,conversation_id' }
    );
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

  const allMessages = [...olderPages.flat(), ...(messagesQuery.data ?? [])]

  return {
    messages: allMessages,
    isLoading: messagesQuery.isLoading,
    olderCount,
    isLoadingOlder,
    loadOlder,
    sendMessage, deleteMessage, editMessage, toggleReaction, markAsRead,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAllPlayers
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
