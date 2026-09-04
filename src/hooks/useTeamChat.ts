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

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { TeamMessageFull, ChatReadReceipt } from '@/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// saveMentions — extrait les @mentions d'un message et les enregistre en DB
// Supporte @everyone (mentionne tous les membres) et @Prénom Nom
// ─────────────────────────────────────────────────────────────────────────────

export async function saveMentions(
  content: string,
  messageId: string,
  mentionedBy: string,
  context: 'team' | 'channel',
  contextId: string,
) {
  // Regex : @mot ou @"plusieurs mots" — on capture tout ce qui suit @
  const mentionRegex = /@([\w\u00C0-\u017E]+(?:\s[\w\u00C0-\u017E]+)?)/g
  const rawMentions = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase().trim())
  if (rawMentions.length === 0) return

  const isEveryone = rawMentions.includes('everyone') || rawMentions.includes('tout') || rawMentions.includes('tous')

  // Récupérer les membres du contexte
  let memberRows: { user_id: string }[]
  if (context === 'team') {
    const { data: players } = await supabase
      .from('players')
      .select('user_id')
      .eq('team_id', contextId)
      .eq('is_active', true)
      .not('user_id', 'is', null)
    memberRows = (players as any ?? []).filter((p: any) => p.user_id) as { user_id: string }[]
  } else {
    // Canal global : récupérer tous les profils actifs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', mentionedBy)
    memberRows = (profiles as any ?? []).map((p: any) => ({ user_id: p.id }))
  }

  let targetUserIds: string[] = []

  if (isEveryone) {
    targetUserIds = memberRows.map(m => m.user_id).filter(id => id !== mentionedBy)
  } else {
    // Résoudre les noms mentionnés → user_ids
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', memberRows.map(m => m.user_id))

    for (const mention of rawMentions) {
      const matched = (profiles as any ?? []).find((p: any) =>
        (p.full_name ?? '').toLowerCase().includes(mention)
      )
      if (matched && matched.id !== mentionedBy) {
        targetUserIds.push(matched.id)
      }
    }
    // Dédupliquer
    targetUserIds = [...new Set(targetUserIds)]
  }

  if (targetUserIds.length === 0) return

  // Insérer dans chat_mentions (ignorer les doublons)
  await (supabase.from('chat_mentions') as any).insert(
    targetUserIds.map(uid => ({
      message_id: messageId,
      mentioned_user_id: uid,
      mentioned_by: mentionedBy,
    }))
  )
}

const MESSAGES_KEY  = (teamId: string) => ['team-chat', 'messages', teamId]
const RECEIPTS_KEY  = (teamId: string) => ['team-chat', 'receipts', teamId]
const PINNED_KEY    = (teamId: string) => ['team-chat', 'pinned', teamId]
const PAGE_SIZE = 50

type ReplyRow = { id: string; content: string; sender: { id: string; full_name: string | null } }
type PinnedMessageRow = {
  pinned_at: string
  pinned_by: string
  message: (TeamMessageFull & { reply_to_id: string | null }) | null
}
type TeamMemberPlayerRow = {
  user_id: string | null
  profile: TeamMember | null
}
type TeamCaptainRow = {
  captain_id: string | null
  captain: TeamMember | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch messages
// ─────────────────────────────────────────────────────────────────────────────

async function fetchMessages(teamId: string, beforeId?: string): Promise<TeamMessageFull[]> {
  let query = supabase
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
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (beforeId) {
    const { data: pivot } = await (supabase.from('team_messages') as any).select('created_at').eq('id', beforeId).single()
    if (pivot) query = query.lt('created_at', pivot.created_at)
  }

  const { data: msgs, error } = await query
  if (error) throw error
  if (!msgs || msgs.length === 0) return []

  const replyIds = [...new Set(
    (msgs as any []).map((m: any) => m.reply_to_id).filter(Boolean) as string[]
  )]
  const replyMap = new Map<string, ReplyRow>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('team_messages')
      .select('id, content, sender:profiles!team_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    for (const r of (replies ?? []) as unknown as ReplyRow[]) replyMap.set(r.id, r)
  }

  return msgs
    .map((m: any) => ({ ...m, reply_to: m.reply_to_id ? (replyMap.get(m.reply_to_id) ?? null) : null }))
    .reverse() as unknown as TeamMessageFull[]
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
  const pinnedRows = data as unknown as PinnedMessageRow[]
  const replyIds = [...new Set(
    pinnedRows.map(p => p.message?.reply_to_id).filter(Boolean) as string[]
  )]
  const replyMap = new Map<string, ReplyRow>()
  if (replyIds.length > 0) {
    const { data: replies } = await supabase
      .from('team_messages')
      .select('id, content, sender:profiles!team_messages_sender_id_fkey(id, full_name)')
      .in('id', replyIds)
    for (const r of (replies ?? []) as unknown as ReplyRow[]) replyMap.set(r.id, r)
  }

  return pinnedRows.filter(p => p.message).map((p) => ({
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

interface ChatPresence {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  is_typing: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function useTeamChat(teamId?: string, currentUserId?: string) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const lastMarkedRef = useRef<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [olderPagesState, setOlderPagesState] = useState<{ teamId?: string; pages: TeamMessageFull[][] }>({ pages: [] })
  const [olderCountState, setOlderCountState] = useState<{ teamId?: string; count: number }>({ count: 0 })
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const olderPages = useMemo(
    () => olderPagesState.teamId === teamId ? olderPagesState.pages : [],
    [olderPagesState, teamId]
  )
  const olderCount = olderCountState.teamId === teamId ? olderCountState.count : 0

  // ── Messages (page courante) ──────────────────────────────────────────────
  const messagesQuery = useQuery({
    queryKey: MESSAGES_KEY(teamId ?? ''),
    enabled: !!teamId,
    queryFn: () => fetchMessages(teamId!),
    staleTime: 0,
  })

  // ── Charger les messages plus anciens ─────────────────────────────────────
  const loadOlder = useCallback(async () => {
    if (!teamId || isLoadingOlder) return
    const allMsgs = [...olderPages.flat(), ...(messagesQuery.data ?? [])]
    const oldest = allMsgs[0]
    if (!oldest) return
    setIsLoadingOlder(true)
    try {
      const page = await fetchMessages(teamId, oldest.id)
      if (page.length > 0) {
        setOlderPagesState(prev => ({
          teamId,
          pages: prev.teamId === teamId ? [page, ...prev.pages] : [page],
        }))
        const { data } = await (supabase.rpc as any)('count_team_messages_before', {
          p_team_id: teamId,
          p_before_id: page[0].id,
        })
        setOlderCountState({ teamId, count: Number(data ?? 0) })
      } else {
        setOlderCountState({ teamId, count: 0 })
      }
    } finally {
      setIsLoadingOlder(false)
    }
  }, [teamId, isLoadingOlder, olderPages, messagesQuery.data])

  // Initialiser le compteur
  useEffect(() => {
    if (!teamId || !messagesQuery.data?.length) return
    const first = messagesQuery.data[0]
    ;(supabase.rpc as any)('count_team_messages_before', {
      p_team_id: teamId,
      p_before_id: first.id,
    }).then(({ data }: any) => setOlderCountState({ teamId, count: Number(data ?? 0) }))
  }, [teamId, messagesQuery.data])

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
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<ChatPresence>()
        const users: TypingUser[] = []
        Object.values(state).flat().forEach((p) => {
          if (p.is_typing && p.user_id !== currentUserId) {
            users.push({
              user_id: p.user_id,
              profile: { id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url }
            })
          }
        })
        setTypingUsers(users)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
        () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId) })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_message_reactions' },
        () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId) })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_pinned_messages', filter: `team_id=eq.${teamId}` },
        () => qc.refetchQueries({ queryKey: PINNED_KEY(teamId) })
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log(`[TeamChat] ${status}`)
      })

    chatChannelRef.current = channel
    return () => { supabase.removeChannel(channel); chatChannelRef.current = null }
  }, [teamId, qc, currentUserId])

  // ── Pinned messages query ─────────────────────────────────────────────────
  const pinnedQuery = useQuery({
    queryKey: PINNED_KEY(teamId ?? ''),
    enabled: !!teamId,
    queryFn: () => fetchPinnedMessages(teamId!),
    staleTime: 0,
  })

  // ── Mark as read ──────────────────────────────────────────────────────────
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markAsRead = useCallback(
    async (lastMsgId: string, lastMsgAt: string) => {
      if (!teamId || !currentUserId) return;
      if (lastMarkedRef.current === lastMsgId) return;
      lastMarkedRef.current = lastMsgId;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        await supabase
          .from('chat_read_receipts')
          .upsert({
            user_id: currentUserId,
            team_id: teamId,
            last_read_at: lastMsgAt,
            last_read_msg: lastMsgId,
          } as any, { onConflict: 'user_id,team_id' });
      }, 2000);
    },
    [teamId, currentUserId]
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async ({ content, replyToId, senderId }: { content: string; replyToId?: string | null; senderId: string }) => {
      const { data: newMsg, error } = await supabase.from('team_messages').insert({
        team_id: teamId!,
        sender_id: senderId,
        content: content.trim(),
        reply_to_id: replyToId ?? null,
      } as any).select('id').single()
      if (error) throw error

      // Extraire et enregistrer les mentions @
      if (newMsg && (newMsg as any)?.id) {
        await saveMentions(content, (newMsg as any).id, senderId, 'team', teamId!)
      }
    },
    onMutate: async () => {
      const queryKey = MESSAGES_KEY(teamId ?? '');
      await qc.cancelQueries({ queryKey });
      const previousMessages = qc.getQueryData<TeamMessageFull[]>(queryKey);

      // Mise à jour optimiste (simplifiée, l'objet message réel serait plus complexe)
      // Ceci est un placeholder pour une implémentation complète de mise à jour optimiste.
      // qc.setQueryData(queryKey, (old) => [...(old || []), { id: 'temp-id', ...newMessage, createdAt: new Date().toISOString(), sender: { id: newMessage.senderId, full_name: 'Moi', avatar_url: null }, reactions: [] }]);

      return { previousMessages };
    },
    onError: (_err, _newMessage, context) => {
      if (context?.previousMessages) {
        qc.setQueryData(MESSAGES_KEY(teamId ?? ''), context.previousMessages);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY(teamId ?? '') });
    },
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
        const { error } = await supabase.from('team_message_reactions').insert({ message_id: messageId, user_id: userId, emoji } as any)
        if (error) throw error
      }
    },
    onMutate: async ({ messageId, emoji, userId, hasReacted }) => {
      const queryKey = MESSAGES_KEY(teamId ?? '');
      await qc.cancelQueries({ queryKey });
      const previousMessages = qc.getQueryData<TeamMessageFull[]>(queryKey);

      // Mise à jour optimiste de la réaction
      qc.setQueryData<TeamMessageFull[]>(queryKey, (old) =>
        old?.map((msg) => {
          if (msg.id === messageId) {
            const newReactions = hasReacted ? msg.reactions.filter((r) => r.user_id !== userId || r.emoji !== emoji) : [...msg.reactions, { id: 'temp-reaction', message_id: messageId, user_id: userId, emoji, created_at: new Date().toISOString(), profile: { id: userId, full_name: 'Moi' } }];
            return { ...msg, reactions: newReactions };
          }
          return msg;
        })
      );
      return { previousMessages };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMessages) qc.setQueryData(MESSAGES_KEY(teamId ?? ''), context.previousMessages);
    },
    onSettled: () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId ?? '') }),
  })

  // ── Edit message ───────────────────────────────────────────────────────────
  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await (supabase.from('team_messages') as any)
        .update({ content: content.trim(), edited_at: new Date().toISOString() })
        .eq('id', messageId)
      if (error) throw error
    },
    onSuccess: () => qc.refetchQueries({ queryKey: MESSAGES_KEY(teamId ?? '') }),
  })

  // ── Set typing indicator ─────────────────────────────────────────────────
  const setTyping = useCallback(async (isTyping: boolean = true) => {
    if (!teamId || !currentUserId || !chatChannelRef.current || !profile) return
    chatChannelRef.current.track({
      user_id: currentUserId,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      is_typing: isTyping,
    })
  }, [teamId, currentUserId, profile])

  // ── Clear typing indicator ───────────────────────────────────────────────
  const clearTyping = useCallback(async () => {
    await setTyping(false)
  }, [setTyping])

  // ── Pin message ───────────────────────────────────────────────────────────
  const pinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!teamId || !currentUserId) return
      const { error } = await supabase.from('team_pinned_messages').insert({
        team_id: teamId,
        message_id: messageId,
        pinned_by: currentUserId,
      } as any)
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
    messages:   [...olderPages.flat(), ...(messagesQuery.data ?? [])],
    receipts:   receiptsQuery.data ?? [],
    pinned:     pinnedQuery.data ?? [],
    typing:     typingUsers,
    isLoading:  messagesQuery.isLoading,
    isError:    messagesQuery.isError,
    olderCount,
    isLoadingOlder,
    loadOlder,
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
// useTeamMembers — liste des membres pour les mentions @
// ─────────────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export function useTeamMembers(teamId?: string) {
  return useQuery({
    queryKey: ['team-members', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamMember[]> => {
      // Joueurs actifs de l'équipe
      const { data: players } = await supabase
        .from('players')
        .select('user_id, profile:profiles!players_user_id_fkey(id, full_name, avatar_url)')
        .eq('team_id', teamId!)
        .eq('is_active', true)

      const members: TeamMember[] = []
      const seen = new Set<string>()

      for (const p of (players ?? []) as unknown as TeamMemberPlayerRow[]) {
        const profile = p.profile
        if (profile && !seen.has(profile.id)) {
          seen.add(profile.id)
          members.push({ id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url })
        }
      }

      // Capitaine (peut ne pas être dans players)
      const { data: team } = await supabase
        .from('teams')
        .select('captain_id, captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url)')
        .eq('id', teamId!)
        .maybeSingle()

      if (team) {
        const cap = (team as unknown as TeamCaptainRow).captain
        if (cap && !seen.has(cap.id)) {
          seen.add(cap.id)
          members.push({ id: cap.id, full_name: cap.full_name, avatar_url: cap.avatar_url })
        }
      }

      return members
    },
    staleTime: 60_000,
  })
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
      const { data: team } = await (supabase.from('teams') as any).select('captain_id').eq('id', teamId!).maybeSingle()
      if ((team as any)?.captain_id === userId) return true
      const { data: profile } = await (supabase.from('profiles') as any).select('role').eq('id', userId!).maybeSingle()
      return (profile as any)?.role === 'admin'
    },
    staleTime: 60_000,
  })
}
