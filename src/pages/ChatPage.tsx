import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ArrowLeft, Plus, Search, X, MessageCircle } from 'lucide-react'
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
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86_400_000)
  // Aujourd'hui -> heure exacte HH:MM comme WhatsApp
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  // Hier
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'
  // Cette semaine -> nom du jour abrege
  if (days < 7) {
    const d = date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
    return d.charAt(0).toUpperCase() + d.slice(1)
  }
  // Plus ancien -> date courte
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

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
  useEffect(() => { setActiveIdx(0) }, [query]) // eslint-disable-line react-hooks/set-state-in-effect

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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6">
          <Search size={15} className="text-slate-500 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un joueur…"
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
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-white/4 last:border-0',
                  idx === activeIdx ? 'bg-white/[0.07]' : 'hover:bg-white/4',
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

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — style WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

type SidebarFilter = 'all' | 'unread' | 'groups' | 'channels' | 'dm'

function ConvAvatar({
  src, name, color, emoji, size = 'md', isOnline,
}: {
  src?: string | null
  name: string
  color?: string
  emoji?: string
  size?: 'md' | 'lg'
  isOnline?: boolean
}) {
  const dim = size === 'lg' ? 'w-13 h-13' : 'w-12 h-12'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className={clsx('relative shrink-0', dim)}>
      {src ? (
        <img src={src} alt={name} className={clsx('rounded-full object-cover w-full h-full')} />
      ) : emoji ? (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-xl"
          style={{ backgroundColor: (color ?? '#3b82f6') + '33' }}
        >
          {emoji}
        </div>
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ backgroundColor: color ?? '#3b82f6' }}
        >
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-chat-bg',
            isOnline ? 'bg-emerald-500' : 'bg-slate-600',
          )}
        />
      )}
    </div>
  )
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold bg-primary-500 text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function Sidebar({
  channels,
  teams,
  dmConvs,
  selected,
  onSelect,
  onNewDm,
}: {
  channels: GlobalChannel[]
  teams: TeamUnread[]
  dmConvs: DmConversation[]
  selected: SelectedItem | null
  onSelect: (item: SelectedItem) => void
  onNewDm: () => void
}) {
  const [filter, setFilter] = useState<SidebarFilter>('all')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const dmContactIds = useMemo(() => dmConvs.map(c => c.other_user.id), [dmConvs])
  const onlineUsers = useOnlineUsers(dmContactIds)

  const totalUnread = useMemo(
    () => teams.reduce((s, t) => s + t.unread, 0)
      + dmConvs.reduce((s, d) => s + d.unread, 0),
    [teams, dmConvs]
  )

  // ── Construire la liste unifiée et filtrée ────────────────────────────────
  type ConvItem =
    | { kind: 'channel'; data: GlobalChannel; name: string; preview: string; time: string | null; unread: number }
    | { kind: 'team';    data: TeamUnread;    name: string; preview: string; time: string | null; unread: number }
    | { kind: 'dm';      data: DmConversation; name: string; preview: string; time: string | null; unread: number }

  const allItems = useMemo((): ConvItem[] => {
    const items: ConvItem[] = []

    channels.forEach(ch => items.push({
      kind: 'channel', data: ch,
      name: ch.name,
      preview: ch.last_message ?? ch.description ?? 'Canal',
      time: ch.last_message_at ?? ch.created_at,
      unread: 0,
    }))

    teams.forEach(t => items.push({
      kind: 'team', data: t,
      name: t.teamName,
      preview: t.lastMessage ?? 'Aucun message',
      time: t.lastMessageAt ?? null,
      unread: t.unread,
    }))

    dmConvs.forEach(c => items.push({
      kind: 'dm', data: c,
      name: c.other_user.full_name ?? 'Joueur',
      preview: c.last_message ?? 'Aucun message',
      time: c.last_message_at ?? null,
      unread: c.unread,
    }))

    // Tri chronologique décroissant — plus récent en haut, comme WhatsApp
    // Les items sans message (time = created_at pour les canaux) vont en bas
    return items.sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0
      const tb = b.time ? new Date(b.time).getTime() : 0
      return tb - ta
    })
  }, [channels, teams, dmConvs])

  const filtered = useMemo(() => {
    let list = allItems
    if (filter === 'unread')   list = list.filter(i => i.unread > 0)
    if (filter === 'groups')   list = list.filter(i => i.kind === 'team')
    if (filter === 'channels') list = list.filter(i => i.kind === 'channel')
    if (filter === 'dm')       list = list.filter(i => i.kind === 'dm')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q))
    }
    return list
  }, [allItems, filter, search])

  const filters: { id: SidebarFilter; label: string; badge?: number }[] = [
    { id: 'all',      label: 'Toutes' },
    { id: 'unread',   label: 'Non lues', badge: totalUnread || undefined },
    { id: 'groups',   label: 'Groupes' },
    { id: 'channels', label: 'Canaux' },
    { id: 'dm',       label: 'Joueurs' },
  ]

  function isSelected(item: ConvItem) {
    if (!selected) return false
    if (item.kind === 'channel' && selected.type === 'channel') return selected.channel.id === item.data.id
    if (item.kind === 'team'    && selected.type === 'team')    return selected.team.teamId === (item.data as TeamUnread).teamId
    if (item.kind === 'dm'      && selected.type === 'dm')      return selected.conv.id === (item.data as DmConversation).id
    return false
  }

  function handleSelect(item: ConvItem) {
    if (item.kind === 'channel') onSelect({ type: 'channel', channel: item.data as GlobalChannel })
    if (item.kind === 'team')    onSelect({ type: 'team',    team: item.data as TeamUnread })
    if (item.kind === 'dm')      onSelect({ type: 'dm',      conv: item.data as DmConversation })
  }

  return (
    <div className="flex flex-col h-full bg-chat-panel">

      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black text-white tracking-tight">Discussions</h1>
          <button
            onClick={onNewDm}
            className="p-2 rounded-xl hover:bg-white/8 text-slate-400 hover:text-white transition-colors"
            title="Nouveau message direct"
            aria-label="Nouveau message"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Barre de recherche */}
        <div
          className="flex items-center gap-2.5 bg-white/6 rounded-2xl px-3.5 py-2.5 cursor-text"
          onClick={() => searchRef.current?.focus()}
        >
          <Search size={15} className="text-slate-500 shrink-0" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher ou démarrer une discussion"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filtres pills ── */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap',
                filter === f.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                  : 'bg-white/[0.07] text-slate-400 hover:bg-white/12 hover:text-white',
              )}
            >
              {f.label}
              {f.badge && f.id !== filter && (
                <span className="w-4 h-4 rounded-full bg-primary-500 text-white text-[9px] font-black flex items-center justify-center">
                  {f.badge > 9 ? '9+' : f.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Liste des conversations ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <Search size={28} className="text-slate-700" />
            <p className="text-slate-500 text-sm">
              {search ? `Aucun résultat pour « ${search} »` : 'Aucune conversation'}
            </p>
            {filter === 'unread' && !search && (
              <p className="text-slate-700 text-xs">Tout est lu 👍</p>
            )}
          </div>
        ) : (
          filtered.map(item => {
            const sel = isSelected(item)
            const ch = item.kind === 'channel' ? (item.data as GlobalChannel) : null
            const team = item.kind === 'team' ? (item.data as TeamUnread) : null
            const dm = item.kind === 'dm' ? (item.data as DmConversation) : null
            const isOnline = dm ? onlineUsers.has(dm.other_user.id) : undefined

            return (
              <button
                key={`${item.kind}-${item.kind === 'channel' ? ch!.id : item.kind === 'team' ? team!.teamId : dm!.id}`}
                onClick={() => handleSelect(item)}
                className={clsx(
                  'w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors',
                  sel ? 'bg-primary-600/15' : 'hover:bg-white/4',
                )}
              >
                {/* Avatar */}
                <ConvAvatar
                  src={dm ? dm.other_user.avatar_url : team?.logo_url}
                  name={item.name}
                  color={ch ? ch.color : team ? team.teamColor : '#3b82f6'}
                  emoji={ch ? ch.icon : undefined}
                  isOnline={isOnline}
                />

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <p className={clsx(
                      'text-sm truncate',
                      item.unread > 0 ? 'font-bold text-white' : sel ? 'font-semibold text-white' : 'font-medium text-slate-200',
                    )}>
                      {item.name}
                    </p>
                    {item.time && (
                      <span className={clsx(
                        'text-[11px] shrink-0',
                        item.unread > 0 ? 'text-primary-400 font-semibold' : 'text-slate-600',
                      )}>
                        {timeAgo(item.time)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={clsx(
                      'text-[13px] truncate leading-snug',
                      item.unread > 0 ? 'text-slate-300 font-medium' : 'text-slate-500',
                    )}>
                      {item.preview}
                    </p>
                    {item.unread > 0 && <UnreadBadge count={item.unread} />}
                  </div>
                </div>
              </button>
            )
          })
        )}
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
  const hasInitialized = useRef(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (hasInitialized.current || selected) return
    if (channels.length > 0) {
      // Schedule state update to prevent cascading renders during effect execution
      queueMicrotask(() => setSelected({ type: 'channel', channel: channels[0] }))
      hasInitialized.current = true
    } else if (teams.length > 0) {
      queueMicrotask(() => setSelected({ type: 'team', team: teams[0] }))
      hasInitialized.current = true
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
  }, [user, getOrCreateDm, dmConvs, handleSelect])

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
          <p className="text-white font-bold text-base">Sélectionnez une conversation</p>
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

      <div className="lg:hidden h-[calc(100vh-8rem)] relative overflow-hidden">
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
          />
        </div>

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
        <div className="w-80 shrink-0 flex flex-col border-r border-surface-border overflow-hidden">
          <Sidebar
            channels={channels}
            teams={teams}
            dmConvs={dmConvs}
            selected={selected}
            onSelect={handleSelect}
            onNewDm={() => setShowNewDm(true)}
          />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderChat()}
        </div>
      </div>
    </>
  )
}
