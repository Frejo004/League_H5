/**
 * TeamChat — Chat de groupe par équipe
 *
 * - Messages avec avatar, nom, heure, reply, réactions
 * - Séparateur "N messages non lus" à la première entrée
 * - Read receipts style Messenger : avatars sous le dernier message lu
 * - Notifications push navigateur (Web Push API)
 * - Picker emoji, suppression optimiste, scroll auto
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Smile, Reply, Trash2, X, MessageCircle, Lock, Bell, BellOff } from 'lucide-react'
import { clsx } from 'clsx'
import { useTeamChat, useIsTeamMember } from '@/hooks/useTeamChat'
import type { ReadReceiptWithProfile } from '@/hooks/useTeamChat'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
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
    // Ne pas notifier si l'onglet est visible
    if (document.visibilityState === 'visible') return
    const n = new Notification(title, {
      body,
      icon: '/logo-h5.png',
      badge: '/logo-h5.png',
      tag: `chat-${teamId}`,   // regroupe les notifs de la même équipe
      renotify: true,
    } as NotificationOptions & { renotify?: boolean })
    n.onclick = () => { window.focus(); n.close() }
  }, [permission])

  return { permission, request, send }
}

// ─────────────────────────────────────────────────────────────────────────────
// Emoji picker
// ─────────────────────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: 'Foot',    emojis: ['⚽','🥅','🏆','🥇','🎯','💪','🔥','⚡','🎉','🙌'] },
  { label: 'Visages', emojis: ['😀','😂','🤣','😍','🥳','😎','🤩','😤','😡','😭'] },
  { label: 'Gestes',  emojis: ['👍','👎','👏','🙏','🤝','✌️','🤙','💯','❤️','🫡'] },
]
const QUICK_REACTIONS = ['👍','❤️','😂','🔥','⚽','💪','🎉','😎']

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 z-50 bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-3 w-72">
      {EMOJI_GROUPS.map(g => (
        <div key={g.label} className="mb-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 px-1">{g.label}</p>
          <div className="flex flex-wrap gap-1">
            {g.emojis.map(e => (
              <button key={e} onClick={() => { onSelect(e); onClose() }}
                className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 transition-colors">
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Reaction bubble
// ─────────────────────────────────────────────────────────────────────────────

function ReactionBubble({ emoji, count, hasReacted, onClick, names }: {
  emoji: string; count: number; hasReacted: boolean; onClick: () => void; names: string
}) {
  return (
    <button onClick={onClick} title={names}
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all',
        hasReacted ? 'bg-primary-600/30 border-primary-500/50 text-primary-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
      )}>
      <span>{emoji}</span>
      <span className="font-semibold tabular-nums">{count}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Read receipt avatars (style Messenger)
// ─────────────────────────────────────────────────────────────────────────────

function ReadReceiptAvatars({ receipts, currentUserId }: {
  receipts: ReadReceiptWithProfile[]
  currentUserId: string
}) {
  // Exclure l'utilisateur courant
  const others = receipts.filter(r => r.user_id !== currentUserId)
  if (others.length === 0) return null

  return (
    <div className="flex items-center gap-0.5 mt-0.5 justify-end pr-1">
      {others.slice(0, 5).map(r => {
        const name = r.profile?.full_name ?? 'Joueur'
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        return (
          <div key={r.user_id} title={`Vu par ${name}`}
            className="w-4 h-4 rounded-full overflow-hidden ring-1 ring-surface-card transition-transform hover:scale-125"
            style={{ marginLeft: others.indexOf(r) > 0 ? '-4px' : 0 }}
          >
            {r.profile?.avatar_url
              ? <img src={r.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full bg-primary-600/60 flex items-center justify-center text-[7px] font-bold text-white">
                  {initials}
                </div>
              )
            }
          </div>
        )
      })}
      {others.length > 5 && (
        <span className="text-[9px] text-slate-500 ml-1">+{others.length - 5}</span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Unread separator
// ─────────────────────────────────────────────────────────────────────────────

function UnreadSeparator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 my-1">
      <div className="flex-1 h-px bg-primary-500/40" />
      <span className="text-[10px] font-bold text-primary-400 whitespace-nowrap bg-primary-500/10 border border-primary-500/20 px-2.5 py-1 rounded-full">
        {count} message{count > 1 ? 's' : ''} non lu{count > 1 ? 's' : ''}
      </span>
      <div className="flex-1 h-px bg-primary-500/40" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Single message
// ─────────────────────────────────────────────────────────────────────────────

function ChatMessage({
  msg,
  currentUserId,
  isAdmin,
  onReply,
  onDelete,
  onReact,
  readBy,       // receipts des gens dont last_read_msg === ce message
}: {
  msg: TeamMessageFull
  currentUserId: string
  isAdmin: boolean
  onReply: (msg: TeamMessageFull) => void
  onDelete: (id: string) => void
  onReact: (messageId: string, emoji: string, hasReacted: boolean) => void
  readBy: ReadReceiptWithProfile[]
}) {
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const isOwn = msg.sender_id === currentUserId
  const canDelete = isOwn || isAdmin

  const reactionMap = new Map<string, { count: number; hasReacted: boolean; names: string[] }>()
  for (const r of msg.reactions) {
    const name = r.profile?.full_name ?? 'Joueur'
    const ex = reactionMap.get(r.emoji)
    if (ex) {
      ex.count++
      if (r.user_id === currentUserId) ex.hasReacted = true
      ex.names.push(name)
    } else {
      reactionMap.set(r.emoji, { count: 1, hasReacted: r.user_id === currentUserId, names: [name] })
    }
  }

  const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const senderName = msg.sender?.full_name ?? 'Joueur'
  const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div
      className={clsx('group flex gap-2.5 px-3 py-1 hover:bg-white/2 rounded-xl transition-colors', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false) }}
    >
      {/* Avatar sender */}
      <div className="shrink-0 mt-0.5">
        {msg.sender?.avatar_url
          ? <img src={msg.sender.avatar_url} alt={senderName} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
          : <div className="w-8 h-8 rounded-full bg-primary-600/40 flex items-center justify-center text-xs font-bold text-primary-300 ring-1 ring-white/10">{initials}</div>
        }
      </div>

      {/* Bubble + read receipts */}
      <div className={clsx('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender + time */}
        <div className={clsx('flex items-baseline gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-semibold text-slate-300">{senderName}</span>
          <span className="text-[10px] text-slate-600">{time}</span>
          {msg.edited_at && <span className="text-[10px] text-slate-600 italic">(modifié)</span>}
        </div>

        {/* Reply preview */}
        {msg.reply_to && (
          <div className={clsx('mb-1 px-2.5 py-1.5 rounded-lg border-l-2 border-primary-500 bg-white/5 text-xs text-slate-400 max-w-full', isOwn && 'border-r-2 border-l-0')}>
            <span className="font-semibold text-primary-400 block">{msg.reply_to.sender?.full_name ?? 'Joueur'}</span>
            <span className="line-clamp-1">{msg.reply_to.content}</span>
          </div>
        )}

        {/* Content */}
        <div className={clsx(
          'px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words',
          isOwn ? 'bg-primary-600/80 text-white rounded-tr-sm' : 'bg-surface-card border border-surface-border text-slate-200 rounded-tl-sm'
        )}>
          {msg.content}
        </div>

        {/* Reactions */}
        {reactionMap.size > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(reactionMap.entries()).map(([emoji, { count, hasReacted, names }]) => (
              <ReactionBubble key={emoji} emoji={emoji} count={count} hasReacted={hasReacted}
                onClick={() => onReact(msg.id, emoji, hasReacted)} names={names.join(', ')} />
            ))}
          </div>
        )}

        {/* ── Read receipts style Messenger ── */}
        {readBy.length > 0 && (
          <ReadReceiptAvatars receipts={readBy} currentUserId={currentUserId} />
        )}
      </div>

      {/* Actions hover */}
      <div className={clsx(
        'flex items-center gap-1 self-center transition-opacity relative',
        showActions ? 'opacity-100' : 'opacity-0 pointer-events-none',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}>
        <div className="relative">
          <button onClick={() => setShowReactionPicker(v => !v)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors" title="Réagir">
            <Smile size={14} />
          </button>
          {showReactionPicker && (
            <div className={clsx('absolute bottom-full mb-1 z-50 bg-surface-card border border-surface-border rounded-xl shadow-xl p-1.5 flex gap-1', isOwn ? 'right-0' : 'left-0')}>
              {QUICK_REACTIONS.map(emoji => {
                const r = reactionMap.get(emoji)
                return (
                  <button key={emoji}
                    onClick={() => { onReact(msg.id, emoji, r?.hasReacted ?? false); setShowReactionPicker(false) }}
                    className={clsx('w-8 h-8 flex items-center justify-center text-base rounded-lg transition-colors', r?.hasReacted ? 'bg-primary-600/30' : 'hover:bg-white/10')}>
                    {emoji}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <button onClick={() => onReply(msg)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors" title="Répondre">
          <Reply size={14} />
        </button>
        {canDelete && (
          <button onClick={() => onDelete(msg.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors" title="Supprimer">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TeamChat
// ─────────────────────────────────────────────────────────────────────────────

interface TeamChatProps {
  teamId: string
  teamColor?: string
  teamName?: string
  /** Mode embarqué dans le ChatPanel — adapte la hauteur */
  embedded?: boolean
}

export function TeamChat({ teamId, teamColor, teamName, embedded = false }: TeamChatProps) {
  const { user, isAdmin } = useAuth()
  const { data: isMember, isLoading: memberLoading } = useIsTeamMember(teamId, user?.id)
  const { messages, receipts, isLoading, sendMessage, deleteMessage, clearChat, toggleReaction, markAsRead } = useTeamChat(teamId, user?.id)
  const push = usePushNotifications()

  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<TeamMessageFull | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // ID du premier message non lu — calculé une seule fois à l'ouverture du chat
  const firstUnreadIdRef = useRef<string | null | undefined>(undefined) // undefined = pas encore calculé

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  // ── Calculer le premier message non lu (une seule fois au chargement) ─────
  const myReceipt = useMemo(() => receipts.find(r => r.user_id === user?.id), [receipts, user?.id])

  useEffect(() => {
    if (firstUnreadIdRef.current !== undefined) return // déjà calculé
    if (isLoading || messages.length === 0) return

    if (!myReceipt) {
      // Jamais ouvert le chat : tous les messages sont "non lus"
      firstUnreadIdRef.current = messages[0]?.id ?? null
    } else {
      // Trouver le premier message après last_read_at
      const firstUnread = messages.find(m => m.created_at > myReceipt.last_read_at && m.sender_id !== user?.id)
      firstUnreadIdRef.current = firstUnread?.id ?? null
    }
  }, [isLoading, messages, myReceipt, user?.id])

  // Nombre de messages non lus
  const unreadCount = useMemo(() => {
    if (!firstUnreadIdRef.current || messages.length === 0) return 0
    const idx = messages.findIndex(m => m.id === firstUnreadIdRef.current)
    return idx === -1 ? 0 : messages.length - idx
  }, [messages])

  // ── Marquer comme lu quand le chat est visible ────────────────────────────
  useEffect(() => {
    if (!messages.length || !user?.id) return
    const last = messages[messages.length - 1]
    markAsRead(last.id, last.created_at)
  }, [messages, user?.id, markAsRead])

  // ── Scroll auto vers le bas sur nouveaux messages ─────────────────────────
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  // ── Notif push pour les messages des autres ───────────────────────────────
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

  // ── Construire la map "qui a lu jusqu'à quel message" ────────────────────
  // Pour chaque message, on veut savoir quels users ont ce message comme last_read_msg
  const readByMessage = useMemo(() => {
    const map = new Map<string, ReadReceiptWithProfile[]>()
    for (const r of receipts) {
      if (!r.last_read_msg) continue
      const existing = map.get(r.last_read_msg) ?? []
      existing.push(r)
      map.set(r.last_read_msg, existing)
    }
    return map
  }, [receipts])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || !user?.id) return
    setInput('')
    setReplyTo(null)
    await sendMessage.mutateAsync({ content, replyToId: replyTo?.id ?? null, senderId: user.id })
  }, [input, user?.id, replyTo, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return
    await deleteMessage.mutateAsync(id)
  }, [deleteMessage])

  const handleReact = useCallback(async (messageId: string, emoji: string, hasReacted: boolean) => {
    if (!user?.id) return
    await toggleReaction.mutateAsync({ messageId, emoji, userId: user.id, hasReacted })
  }, [user?.id, toggleReaction])

  // ── Access guards ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={clsx('flex flex-col', embedded ? 'h-full' : 'card')} style={embedded ? {} : { height: '540px' }}>

      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-surface-border shrink-0">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: teamColor ?? '#16a34a' }} />
        <MessageCircle size={14} className="text-primary-400" />
        <h2 className="section-title mb-0">Chat d'équipe</h2>

        {/* Bouton permission push */}
        {typeof Notification !== 'undefined' && push.permission !== 'granted' && (
          <button
            onClick={push.request}
            title="Activer les notifications"
            className="ml-1 p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-primary-400 transition-colors"
          >
            <Bell size={13} />
          </button>
        )}
        {push.permission === 'granted' && (
          <span title="Notifications activées">
            <Bell size={12} className="text-primary-400 ml-1" />
          </span>
        )}
        {push.permission === 'denied' && (
          <span title="Notifications bloquées par le navigateur">
            <BellOff size={12} className="text-slate-600 ml-1" />
          </span>
        )}

        <span className="ml-auto text-[10px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full mr-2">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>

        {isAdmin && messages.length > 0 && (
          <button
            onClick={async () => {
              if (confirm(`Voulez-vous supprimer TOUS les messages (${messages.length}) de ce groupe ? Cette action est irréversible.`)) {
                await clearChat.mutateAsync()
              }
            }}
            disabled={clearChat.isPending}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1.5"
            title="Vider la discussion"
          >
            {clearChat.isPending ? <LoadingSpinner size="sm" /> : <Trash2 size={13} />}
            <span className="text-[10px] font-bold">Vider</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner size="md" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
            <MessageCircle size={32} className="text-slate-600" />
            <p className="text-slate-500 text-sm">Aucun message pour l'instant.</p>
            <p className="text-slate-600 text-xs">Soyez le premier à écrire !</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isFirstUnread = msg.id === firstUnreadIdRef.current && unreadCount > 0
            const readBy = readByMessage.get(msg.id) ?? []

            return (
              <div key={msg.id}>
                {/* Séparateur messages non lus */}
                {isFirstUnread && <UnreadSeparator count={unreadCount} />}

                <ChatMessage
                  msg={msg}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onReply={setReplyTo}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  readBy={readBy}
                />
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-t border-surface-border shrink-0">
          <Reply size={12} className="text-primary-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary-400">{replyTo.sender?.full_name ?? 'Joueur'}</span>
            <p className="text-xs text-slate-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-3 border-t border-surface-border shrink-0 relative">
        {showEmojiPicker && (
          <EmojiPicker onSelect={e => { setInput(p => p + e); inputRef.current?.focus() }} onClose={() => setShowEmojiPicker(false)} />
        )}
        <button onClick={() => setShowEmojiPicker(v => !v)}
          className={clsx('p-2 rounded-xl transition-colors shrink-0 mb-0.5', showEmojiPicker ? 'bg-primary-600/30 text-primary-400' : 'hover:bg-white/10 text-slate-400 hover:text-slate-200')}
          title="Emojis">
          <Smile size={18} />
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message… (Entrée pour envoyer)"
          rows={1}
          className={clsx(
            'flex-1 resize-none bg-white/5 border border-surface-border rounded-xl px-3 py-2',
            'text-sm text-white placeholder-slate-600',
            'focus:outline-none focus:border-primary-500/50 focus:bg-white/8',
            'transition-colors max-h-28 overflow-y-auto',
            'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'
          )}
          style={{ lineHeight: '1.5' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 112) + 'px'
          }}
        />
        <button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending}
          className={clsx('p-2 rounded-xl transition-all shrink-0 mb-0.5',
            input.trim() ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/20' : 'bg-white/5 text-slate-600 cursor-not-allowed')}
          title="Envoyer">
          {sendMessage.isPending ? <LoadingSpinner size="sm" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
