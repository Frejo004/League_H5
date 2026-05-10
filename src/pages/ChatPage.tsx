/**
 * ChatPage � Messagerie compl�te
 *
 * Sidebar 3 sections :
 *   1. Canaux globaux  (G�n�ral, Capitaines & Admins)
 *   2. Groupes �quipes (TeamChat existant)
 *   3. Messages directs (DMs entre joueurs)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { MessageCircle, ArrowLeft, Plus, Search, X, Shield } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useChatUnread } from '@/hooks/useChatUnread'
import { TeamChat } from '@/components/ui/TeamChat'
import { GenericChat } from '@/components/ui/GenericChat'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { TeamUnread } from '@/hooks/useChatUnread'
import {
  useGlobalChannels,
  useChannelChat,
  useDmConversations,
  useDmChat,
  useGetOrCreateDm,
  useAllPlayers,
} from '@/hooks/useChannelChat'
import type { GlobalChannel, DmConversation } from '@/hooks/useChannelChat'
import { useOnlineUsers, useIsOnline } from '@/hooks/usePresence'
import { supabase } from '@/lib/supabase'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return "� l'instant"
  if (mins < 60) return `${mins}min`
  if (hours < 24) return `${hours}h`
  return `${days}j`
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// -----------------------------------------------------------------------------
// Types de s�lection
// -----------------------------------------------------------------------------

type SelectedItem =
  | { type: 'channel'; channel: GlobalChannel }
  | { type: 'team'; team: TeamUnread }
  | { type: 'dm'; conv: DmConversation }

// -----------------------------------------------------------------------------
// Modal nouveau DM
// -----------------------------------------------------------------------------

function NewDmModal({
  currentUserId,
  onSelect,
  onClose,
}: {
  currentUserId: string
  onSelect: (userId: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const { data: players = [] } = useAllPlayers(currentUserId)

  const filtered = players.filter(p =>
    !query || (p.full_name ?? '').toLowerCase().includes(query.toLowerCase())
  )

  // Reset index quand la liste change
  useEffect(() => { setActiveIdx(0) }, [query])

  // Fermeture sur Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault()
      onSelect(filtered[activeIdx].id)
    }
  }

  // Scroll l'item actif dans la vue
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[activeIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 bg-chat-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search size={15} className="text-slate-500 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un joueur�"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
            aria-label="Rechercher un joueur"
            role="combobox"
            aria-expanded={filtered.length > 0}
            aria-activedescendant={filtered[activeIdx] ? `dm-player-${filtered[activeIdx].id}` : undefined}
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/8 text-slate-600 hover:text-slate-300 transition-colors"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
          role="listbox"
        >
          {filtered.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">Aucun joueur</p>
          ) : (
            filtered.map((p, idx) => (
              <button
                key={p.id}
                id={`dm-player-${p.id}`}
                role="option"
                aria-selected={idx === activeIdx}
                onClick={() => onSelect(p.id)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-white/[0.04] last:border-0',
                  idx === activeIdx ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]',
                )}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.full_name ?? ''} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary-600/40 flex items-center justify-center text-xs font-bold text-primary-300 shrink-0">
                    {getInitials(p.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.full_name ?? 'Joueur'}</p>
                  <p className="text-[10px] text-slate-600 capitalize">{p.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Sidebar
// -----------------------------------------------------------------------------

function Sidebar({
  channels,
  teams,
  dmConvs,
  selected,
  onSelect,
  onNewDm,
  isAdmin,
  isCaptain,
}: {
  channels: GlobalChannel[]
  teams: TeamUnread[]
  dmConvs: DmConversation[]
  selected: SelectedItem | null
  onSelect: (item: SelectedItem) => void
  onNewDm: () => void
  isAdmin: boolean
  isCaptain: boolean
}) {
  const totalUnread =
    teams.reduce((s, t) => s + t.unread, 0) +
    dmConvs.reduce((s, d) => s + d.unread, 0)

  // Présence : collecter tous les IDs des contacts DM en un seul appel
  const dmContactIds = useMemo(
    () => dmConvs.map(c => c.other_user.id).filter(Boolean),
    [dmConvs]
  )
  const onlineUsers = useOnlineUsers(dmContactIds)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-surface-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2">
              <MessageCircle size={16} className="text-primary-400" />
              Messages
            </h1>
            {totalUnread > 0 && (
              <p className="text-[10px] text-primary-400 font-bold mt-0.5">
                {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onNewDm}
            className="p-1.5 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 transition-colors"
            title="Nouveau message direct"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
      >
        {/* Canaux */}
        {channels.length > 0 && (
          <div className="pt-3 pb-1">
            <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Canaux</p>
            {channels.map(ch => {
              const isSelected = selected?.type === 'channel' && selected.channel.id === ch.id
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelect({ type: 'channel', channel: ch })}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2',
                    isSelected
                      ? 'bg-primary-600/10 border-l-primary-500'
                      : 'hover:bg-white/[0.03] border-l-transparent',
                  )}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: ch.color + '33' }}
                  >
                    {ch.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-semibold truncate', isSelected ? 'text-white' : 'text-slate-300')}>
                      {ch.name}
                    </p>
                    {ch.is_read_only && (
                      <p className="text-[10px] text-amber-500/60">Lecture seule</p>
                    )}
                  </div>
                  {ch.slug === 'captains' && (
                    <Shield size={11} className="text-amber-400/50 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Equipes */}
        {teams.length > 0 && (
          <div className="pt-3 pb-1">
            <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Equipes</p>
            {teams.map(team => {
              const isSelected = selected?.type === 'team' && selected.team.teamId === team.teamId
              return (
                <button
                  key={team.teamId}
                  onClick={() => onSelect({ type: 'team', team })}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2',
                    isSelected
                      ? 'bg-primary-600/10 border-l-primary-500'
                      : 'hover:bg-white/[0.03] border-l-transparent',
                  )}
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black overflow-hidden"
                      style={{ backgroundColor: team.teamColor }}
                    >
                      {team.logo_url
                        ? <img src={team.logo_url} alt={team.teamName} className="w-full h-full object-contain" />
                        : team.teamName[0].toUpperCase()
                      }
                    </div>
                    {team.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-(--color-chat-bg) animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={clsx('text-sm truncate', team.unread > 0 ? 'font-black text-white' : 'font-semibold text-slate-400')}>
                        {team.teamName}
                      </p>
                      {team.lastMessageAt && (
                        <span className={clsx('text-[10px] shrink-0', team.unread > 0 ? 'text-primary-400 font-bold' : 'text-slate-600')}>
                          {timeAgo(team.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className={clsx('text-xs truncate', team.unread > 0 ? 'text-slate-200 font-medium' : 'text-slate-500')}>
                      {team.lastMessage ?? 'Aucun message'}
                    </p>
                  </div>
                  {team.unread > 0 && (
                    <span
                      className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-black"
                      style={{ backgroundColor: '#C8F135', color: '#0D1117' }}
                    >
                      {team.unread > 99 ? '99+' : team.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* DMs */}
        <div className="pt-3 pb-3">
          <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Messages directs</p>
          {dmConvs.length === 0 ? (
            <button
              onClick={onNewDm}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-400 transition-colors text-xs"
            >
              <Plus size={12} />
              Demarrer une conversation
            </button>
          ) : (
            dmConvs.map(conv => {
              const isSelected = selected?.type === 'dm' && selected.conv.id === conv.id
              const other = conv.other_user
              const isOnline = onlineUsers.has(other.id)
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect({ type: 'dm', conv })}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2',
                    isSelected
                      ? 'bg-primary-600/10 border-l-primary-500'
                      : 'hover:bg-white/[0.03] border-l-transparent',
                  )}
                >
                  <div className="relative shrink-0">
                    {other.avatar_url ? (
                      <img src={other.avatar_url} alt={other.full_name ?? ''} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary-600/40 flex items-center justify-center text-xs font-bold text-primary-300">
                        {getInitials(other.full_name)}
                      </div>
                    )}
                    {/* Point de présence — vert si en ligne, gris sinon */}
                    <span
                      className={clsx(
                        'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-(--color-chat-bg)',
                        isOnline ? 'bg-emerald-500' : 'bg-slate-600',
                      )}
                    />
                    {/* Badge non-lus par-dessus */}
                    {conv.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-(--color-chat-bg) animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={clsx('text-sm truncate', conv.unread > 0 ? 'font-black text-white' : 'font-semibold text-slate-400')}>
                        {other.full_name ?? 'Joueur'}
                      </p>
                      {conv.last_message_at && (
                        <span className={clsx('text-[10px] shrink-0', conv.unread > 0 ? 'text-primary-400 font-bold' : 'text-slate-600')}>
                          {timeAgo(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className={clsx('text-xs truncate', conv.unread > 0 ? 'text-slate-200 font-medium' : 'text-slate-500')}>
                      {conv.last_message ?? 'Aucun message'}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span
                      className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-black"
                      style={{ backgroundColor: '#C8F135', color: '#0D1117' }}
                    >
                      {conv.unread > 99 ? '99+' : conv.unread}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// ChannelChatView
// -----------------------------------------------------------------------------

function ChannelChatView({
  channel,
  currentUserId,
  isAdmin,
}: {
  channel: GlobalChannel
  currentUserId: string
  isAdmin: boolean
}) {
  const {
    messages, isLoading, sendMessage, deleteMessage,
    editMessage, toggleReaction, markAsRead, toggleReadOnly,
    olderCount, isLoadingOlder, loadOlder,
  } = useChannelChat(channel.id, currentUserId)

  const genericMessages = messages.map(m => ({
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    reply_to_id: m.reply_to_id,
    sender: m.sender ?? { id: m.sender_id, full_name: null, avatar_url: null },
    reactions: m.reactions,
    reply_to: m.reply_to,
  }))

  const extraActions = isAdmin ? (
    <button
      onClick={() => toggleReadOnly.mutateAsync({ id: channel.id, value: !channel.is_read_only })}
      className={clsx(
        'text-[10px] px-2 py-1 rounded-lg border transition-colors shrink-0',
        channel.is_read_only
          ? 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
          : 'text-slate-500 border-white/10 hover:bg-white/8',
      )}
      title={channel.is_read_only ? "Reactiver l'ecriture" : 'Passer en lecture seule'}
    >
      {channel.is_read_only ? 'Lecture seule' : 'Actif'}
    </button>
  ) : undefined

  return (
    <GenericChat
      messages={genericMessages}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      isReadOnly={channel.is_read_only}
      isLoading={isLoading}
      onSend={(content, replyToId) =>
        sendMessage.mutateAsync({ content, replyToId, senderId: currentUserId })
      }
      onDelete={id => deleteMessage.mutateAsync(id)}
      onEdit={(id, content) => editMessage.mutateAsync({ messageId: id, content })}
      onReact={(messageId, emoji, hasReacted) =>
        toggleReaction.mutateAsync({ messageId, emoji, userId: currentUserId, hasReacted })
      }
      onMarkAsRead={markAsRead}
      headerTitle={channel.name}
      headerSubtitle={channel.description ?? undefined}
      headerColor={channel.color}
      headerIcon={channel.icon}
      embedded
      extraHeaderActions={extraActions}
      olderCount={olderCount}
      isLoadingOlder={isLoadingOlder}
      onLoadOlder={loadOlder}
      emptyContext="channel"
    />
  )
}

// -----------------------------------------------------------------------------
// DmChatView
// -----------------------------------------------------------------------------

function DmChatView({
  conv,
  currentUserId,
  isAdmin,
}: {
  conv: DmConversation
  currentUserId: string
  isAdmin: boolean
}) {
  const {
    messages, isLoading, sendMessage, deleteMessage,
    editMessage, toggleReaction, markAsRead,
    olderCount, isLoadingOlder, loadOlder,
  } = useDmChat(conv.id, currentUserId)

  const other = conv.other_user
  const isOnline = useIsOnline(other.id)

  const genericMessages = messages.map(m => ({
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    reply_to_id: m.reply_to_id,
    sender: m.sender ?? { id: m.sender_id, full_name: null, avatar_url: null },
    reactions: m.reactions,
    reply_to: m.reply_to,
  }))

  return (
    <GenericChat
      messages={genericMessages}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      isReadOnly={false}
      isLoading={isLoading}
      onSend={(content, replyToId) =>
        sendMessage.mutateAsync({ content, replyToId, senderId: currentUserId })
      }
      onDelete={id => deleteMessage.mutateAsync(id)}
      onEdit={(id, content) => editMessage.mutateAsync({ messageId: id, content })}
      onReact={(messageId, emoji, hasReacted) =>
        toggleReaction.mutateAsync({ messageId, emoji, userId: currentUserId, hasReacted })
      }
      onMarkAsRead={markAsRead}
      headerTitle={other.full_name ?? 'Joueur'}
      headerAvatar={other.avatar_url}
      headerSubtitle={isOnline ? 'En ligne' : 'Hors ligne'}
      headerOnline={isOnline}
      headerColor="#3b82f6"
      headerIcon="💬"
      embedded
      olderCount={olderCount}
      isLoadingOlder={isLoadingOlder}
      onLoadOlder={loadOlder}
      emptyContext="dm"
    />
  )
}

// -----------------------------------------------------------------------------
// Page principale
// -----------------------------------------------------------------------------

export function ChatPage() {
  const { user, isAdmin } = useAuth()
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [showNewDm, setShowNewDm] = useState(false)
  const [isCaptain, setIsCaptain] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('teams')
      .select('id')
      .eq('captain_id', user.id)
      .limit(1)
      .then(({ data }) => setIsCaptain((data?.length ?? 0) > 0))
  }, [user?.id])

  const { data: teams = [], isLoading: teamsLoading } = useChatUnread(user?.id, isAdmin)
  const { data: channels = [], isLoading: channelsLoading } = useGlobalChannels(user?.id, isAdmin, isCaptain)
  const { data: dmConvs = [], isLoading: dmsLoading } = useDmConversations(user?.id)
  const getOrCreateDm = useGetOrCreateDm()

  const isLoading = teamsLoading || channelsLoading || dmsLoading

  // S�lection auto desktop uniquement (ne pas ouvrir le chat sur mobile)
  useEffect(() => {
    if (selected) return
    if (channels.length > 0) {
      setSelected({ type: 'channel', channel: channels[0] })
      // Ne pas setMobileShowChat(true) ici � l'user doit choisir explicitement sur mobile
    } else if (teams.length > 0) {
      setSelected({ type: 'team', team: teams[0] })
    }
  }, [channels, teams, selected])

  const handleSelect = useCallback((item: SelectedItem) => {
    setSelected(item)
    setMobileShowChat(true)
  }, [])

  const handleNewDm = useCallback(async (otherUserId: string) => {
    if (!user?.id) return
    setShowNewDm(false)
    try {
      const convId = await getOrCreateDm.mutateAsync(otherUserId)
      const existing = dmConvs.find(c => c.id === convId)
      if (existing) {
        handleSelect({ type: 'dm', conv: existing })
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherUserId)
          .single()
        const fakeConv: DmConversation = {
          id: convId,
          user_a: user.id < otherUserId ? user.id : otherUserId,
          user_b: user.id < otherUserId ? otherUserId : user.id,
          created_at: new Date().toISOString(),
          other_user: profile ?? { id: otherUserId, full_name: 'Joueur', avatar_url: null },
          last_message: null,
          last_message_at: null,
          unread: 0,
        }
        handleSelect({ type: 'dm', conv: fakeConv })
      }
    } catch (e) {
      console.error('Erreur creation DM', e)
    }
  }, [user?.id, getOrCreateDm, dmConvs, handleSelect])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const renderChat = () => {
    if (!selected || !user) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-600/20 flex items-center justify-center">
            <MessageCircle size={28} className="text-primary-400" />
          </div>
          <p className="text-white font-bold text-base">Selectionnez une conversation</p>
          <p className="text-slate-500 text-sm">Choisissez un canal ou un groupe dans la liste.</p>
        </div>
      )
    }
    if (selected.type === 'channel') {
      return <ChannelChatView channel={selected.channel} currentUserId={user.id} isAdmin={isAdmin} />
    }
    if (selected.type === 'team') {
      return (
        <TeamChat
          teamId={selected.team.teamId}
          teamColor={selected.team.teamColor}
          teamName={selected.team.teamName}
          embedded
        />
      )
    }
    if (selected.type === 'dm') {
      return <DmChatView conv={selected.conv} currentUserId={user.id} isAdmin={isAdmin} />
    }
    return null
  }

  const mobileTitle = !selected ? ''
    : selected.type === 'channel' ? selected.channel.name
    : selected.type === 'team' ? selected.team.teamName
    : selected.conv.other_user.full_name ?? 'Message direct'

  return (
    <>
      {showNewDm && user && (
        <NewDmModal
          currentUserId={user.id}
          onSelect={handleNewDm}
          onClose={() => setShowNewDm(false)}
        />
      )}

      {/* MOBILE � slide horizontal entre sidebar et chat */}
      <div className="lg:hidden h-[calc(100vh-8rem)] relative overflow-hidden">
        {/* Sidebar � slide out � gauche quand chat ouvert */}
        <div
          className="absolute inset-0 card p-0 overflow-hidden transition-transform duration-300 ease-in-out"
          style={{ transform: mobileShowChat ? 'translateX(-100%)' : 'translateX(0)' }}
        >
          <Sidebar
            channels={channels}
            teams={teams}
            dmConvs={dmConvs}
            selected={selected}
            onSelect={handleSelect}
            onNewDm={() => setShowNewDm(true)}
            isAdmin={isAdmin}
            isCaptain={isCaptain}
          />
        </div>

        {/* Chat � slide in depuis la droite */}
        <div
          className="absolute inset-0 card p-0 overflow-hidden flex flex-col transition-transform duration-300 ease-in-out"
          style={{ transform: mobileShowChat ? 'translateX(0)' : 'translateX(100%)' }}
        >
          {/* Barre de retour */}
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-surface-border shrink-0">
            <button
              onClick={() => setMobileShowChat(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="font-bold text-white text-sm truncate">{mobileTitle}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {mobileShowChat && renderChat()}
          </div>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:flex h-[calc(100vh-8rem)] card p-0 overflow-hidden">
        <div className="w-72 shrink-0 flex flex-col border-r border-surface-border">
          <Sidebar
            channels={channels}
            teams={teams}
            dmConvs={dmConvs}
            selected={selected}
            onSelect={handleSelect}
            onNewDm={() => setShowNewDm(true)}
            isAdmin={isAdmin}
            isCaptain={isCaptain}
          />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderChat()}
        </div>
      </div>
    </>
  )
}