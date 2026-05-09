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
import { Send, Smile, Reply, Trash2, X, MessageCircle, Lock, Bell, BellOff, Pin, Edit2, ChevronDown, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import { useTeamChat, useIsTeamMember, useTeamMembers } from '@/hooks/useTeamChat'
import type { ReadReceiptWithProfile, PinnedMessage, TypingUser, TeamMember } from '@/hooks/useTeamChat'
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
  { label: 'Visages', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'] },
  { label: 'Gestes',  emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄'] },
  { label: 'Foot & Sport', emojis: ['⚽','🥅','🏆','🥇','🥈','🥉','🎖️','🏅','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🏒','🏑','🏏','⛳','🏹','🎣','🛹','🛷','⛸️','🎿','⛷️','🏂','🏋️','🤸','🏃','🏃‍♀️','🥇','🎯','💪','🔥','⚡','🎉','🙌'] },
  { label: 'Objets', emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖱️','🕹️','🗂️','📁','📂','📅','📆','🗑️','🗒️','📁','📂','🗄️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧱','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸'] },
  { label: 'Symboles', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭'] },
]
// Set de réactions Microsoft Teams : Like, Love, Laugh, Surprised, Sad, Angry
const QUICK_REACTIONS = ['👍','❤️','😂','😲','😢','😡']

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 z-50 bg-[#161B22] border border-white/10 rounded-2xl shadow-2xl p-0 w-80 overflow-hidden flex flex-col max-h-[400px]">
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">Émojis</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {EMOJI_GROUPS.map(g => (
          <div key={g.label} className="mb-4 last:mb-0">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 px-1">{g.label}</h4>
            <div className="grid grid-cols-8 gap-1">
              {g.emojis.map(e => (
                <button
                  key={e}
                  onClick={() => { onSelect(e); onClose() }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
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
    <div className="flex items-center gap-3 px-4 py-2 my-2">
      <div className="flex-1 h-px bg-primary-500/30" />
      <span className="text-[10px] font-bold text-primary-400 whitespace-nowrap bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full tracking-wide">
        {count} nouveau{count > 1 ? 'x' : ''} message{count > 1 ? 's' : ''}
      </span>
      <div className="flex-1 h-px bg-primary-500/30" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Date separator
// ─────────────────────────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const label = isToday
    ? "Aujourd'hui"
    : isYesterday
    ? 'Hier'
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })

  return (
    <div className="flex items-center gap-3 px-4 py-3 my-1">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap px-2">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mention dropdown
// ─────────────────────────────────────────────────────────────────────────────

function MentionDropdown({
  members,
  query,
  onSelect,
  onClose,
}: {
  members: TeamMember[]
  query: string
  onSelect: (member: TeamMember | 'everyone') => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lq = query.toLowerCase()

  const filtered = members.filter(m =>
    !lq || (m.full_name ?? '').toLowerCase().includes(lq)
  )

  const showEveryone = !lq || 'everyone'.includes(lq) || 'tout le monde'.includes(lq)

  const items = [
    ...(showEveryone ? [{ type: 'everyone' as const }] : []),
    ...filtered.map(m => ({ type: 'member' as const, member: m })),
  ]

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  if (items.length === 0) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 bg-[#161B22] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-64"
    >
      <div className="px-3 py-2 border-b border-white/5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mentionner</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {items.map((item, i) =>
          item.type === 'everyone' ? (
            <button
              key="everyone"
              onMouseDown={e => { e.preventDefault(); onSelect('everyone') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-primary-600/40 flex items-center justify-center text-xs font-bold text-primary-300 shrink-0">
                @
              </div>
              <div>
                <div className="text-sm font-semibold text-white">everyone</div>
                <div className="text-[10px] text-slate-500">Notifier tout le monde</div>
              </div>
            </button>
          ) : (
            <button
              key={item.member.id}
              onMouseDown={e => { e.preventDefault(); onSelect(item.member) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
            >
              {item.member.avatar_url ? (
                <img src={item.member.avatar_url} alt={item.member.full_name ?? ''} className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-600/40 flex items-center justify-center text-xs font-bold text-primary-300 shrink-0">
                  {(item.member.full_name ?? '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
              <span className="text-sm text-slate-200 truncate">{item.member.full_name ?? 'Joueur'}</span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Link preview
// ─────────────────────────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g

function useLinkPreview(url: string) {
  const [meta, setMeta] = useState<{ title?: string; description?: string; image?: string; hostname: string } | null>(null)

  useEffect(() => {
    // On extrait juste le hostname pour l'affichage — pas de fetch externe
    try {
      const u = new URL(url)
      setMeta({ hostname: u.hostname.replace('www.', '') })
    } catch {
      setMeta(null)
    }
  }, [url])

  return meta
}

function LinkPreview({ url }: { url: string }) {
  const meta = useLinkPreview(url)
  if (!meta) return null

  // Détection YouTube
  const isYoutube = /youtube\.com|youtu\.be/.test(url)
  const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const ytId = ytMatch?.[1]

  // Détection image directe
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-xl overflow-hidden max-w-xs border border-white/8 hover:border-white/20 transition-colors">
        <img src={url} alt="Image" className="w-full object-cover max-h-48" loading="lazy" />
      </a>
    )
  }

  if (isYoutube && ytId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="block mt-2 rounded-xl overflow-hidden max-w-xs border border-white/8 hover:border-white/20 transition-colors group relative">
        <img
          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
          alt="YouTube"
          className="w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <div className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[13px] border-transparent border-l-white ml-1" />
          </div>
        </div>
        <div className="px-3 py-2 bg-[#1a2030]">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-red-500 font-bold">▶</span> youtube.com
          </p>
        </div>
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 mt-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.07] hover:border-white/15 transition-all max-w-xs group">
      <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">
        <ExternalLink size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-300 truncate group-hover:text-white transition-colors">{meta.hostname}</p>
        <p className="text-[10px] text-slate-600 truncate">{url.length > 40 ? url.slice(0, 40) + '…' : url}</p>
      </div>
    </a>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Render message content with @mention highlights + link detection
// ─────────────────────────────────────────────────────────────────────────────

function renderMessageContent(content: string) {
  // Split on URLs and @mentions
  const SPLIT_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|@everyone|@[\w\u00C0-\u017E]+(?: [\w\u00C0-\u017E]+){0,2})/g
  const parts = content.split(SPLIT_REGEX).filter(Boolean)

  const urls: string[] = []
  const inlineNodes = parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      urls.push(part)
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-primary-400 hover:text-primary-300 underline underline-offset-2 break-all transition-colors">
          {part}
        </a>
      )
    }
    if (part.startsWith('@')) {
      return (
        <span key={i} className="inline-flex items-center font-semibold text-primary-300 bg-primary-500/15 rounded px-0.5">
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })

  return (
    <>
      <span className="leading-relaxed">{inlineNodes}</span>
      {/* Preview pour la première URL uniquement */}
      {urls[0] && <LinkPreview url={urls[0]} />}
    </>
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
  onEdit,
  onPin,
  onUnpin,
  isPinned,
  readBy,
  isEditing,
  editContent,
  onEditChange,
  onEditSave,
  onEditCancel,
  isGrouped,       // même expéditeur que le message précédent
  isLastInGroup,   // dernier d'un groupe consécutif
}: {
  msg: TeamMessageFull
  currentUserId: string
  isAdmin: boolean
  onReply: (msg: TeamMessageFull) => void
  onDelete: (id: string) => void
  onReact: (messageId: string, emoji: string, hasReacted: boolean) => void
  onEdit: (msg: TeamMessageFull) => void
  onPin: (msg: TeamMessageFull) => void
  onUnpin: (msg: TeamMessageFull) => void
  isPinned?: boolean
  readBy: ReadReceiptWithProfile[]
  isEditing?: boolean
  editContent?: string
  onEditChange?: (content: string) => void
  onEditSave?: () => void
  onEditCancel?: () => void
  isGrouped?: boolean
  isLastInGroup?: boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const isOwn = msg.sender_id === currentUserId
  const canDelete = isOwn || isAdmin
  const canPin = isAdmin

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

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave?.() }
    if (e.key === 'Escape') { onEditCancel?.() }
  }

  const editInputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.style.height = 'auto'
      editInputRef.current.style.height = Math.min(editInputRef.current.scrollHeight, 112) + 'px'
    }
  }, [isEditing])

  // Coins de bulle selon position dans le groupe
  const ownBubbleRadius = isGrouped && !isLastInGroup
    ? 'rounded-2xl rounded-tr-md'
    : isGrouped && isLastInGroup
    ? 'rounded-2xl rounded-tr-sm'
    : 'rounded-2xl rounded-tr-sm'

  const otherBubbleRadius = isGrouped && !isLastInGroup
    ? 'rounded-2xl rounded-tl-md'
    : isGrouped && isLastInGroup
    ? 'rounded-2xl rounded-tl-sm'
    : 'rounded-2xl rounded-tl-sm'

  return (
    <div
      className={clsx(
        'group relative flex gap-2.5 px-3 rounded-lg transition-colors duration-100',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        isGrouped ? 'pt-0.5 pb-0' : 'pt-2 pb-0',
        'hover:bg-white/[0.02]'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false) }}
    >
      {/* Avatar — masqué si groupé, espace réservé sinon */}
      <div className="shrink-0 w-8 mt-0.5">
        {!isGrouped && (
          msg.sender?.avatar_url
            ? <img src={msg.sender.avatar_url} alt={senderName} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
            : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600/60 to-primary-800/60 flex items-center justify-center text-xs font-bold text-primary-200 ring-1 ring-white/10">{initials}</div>
        )}
      </div>

      {/* Contenu */}
      <div className={clsx('flex flex-col min-w-0', isOwn ? 'items-end flex-1' : 'items-start flex-1')}>

        {/* Nom + heure — seulement sur le premier du groupe */}
        {!isGrouped && (
          <div className={clsx('flex items-baseline gap-2 mb-1', isOwn && 'flex-row-reverse')}>
            <span className={clsx('text-xs font-semibold', isOwn ? 'text-primary-300' : 'text-slate-300')}>
              {isOwn ? 'Vous' : senderName}
            </span>
            <span className="text-[10px] text-slate-600">{time}</span>
            {msg.edited_at && <span className="text-[10px] text-slate-600 italic">· modifié</span>}
            {isPinned && <Pin size={9} className="text-amber-400/70" title="Épinglé" />}
          </div>
        )}

        {/* Reply preview */}
        {msg.reply_to && (
          <div className={clsx(
            'mb-1.5 px-3 py-1.5 rounded-xl text-xs max-w-xs cursor-pointer',
            'border-l-2 border-primary-500/60 bg-white/[0.04] hover:bg-white/[0.07] transition-colors',
            isOwn && 'border-r-2 border-l-0'
          )}>
            <span className="font-semibold text-primary-400 block text-[11px]">{msg.reply_to.sender?.full_name ?? 'Joueur'}</span>
            <span className="text-slate-500 line-clamp-1">{msg.reply_to.content}</span>
          </div>
        )}

        {/* Bulle */}
        {isEditing ? (
          <div className={clsx(
            'w-full max-w-sm px-3.5 py-2.5 rounded-2xl text-sm border-2',
            isOwn ? 'bg-primary-700/60 border-primary-500/50' : 'bg-[#1e2530] border-primary-500/50'
          )}>
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={e => onEditChange?.(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full resize-none bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              rows={2}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 112) + 'px'
              }}
            />
            <div className="flex items-center gap-3 mt-2 justify-end">
              <button onClick={onEditCancel} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Annuler</button>
              <button onClick={onEditSave} className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">Enregistrer</button>
            </div>
          </div>
        ) : (
          <div className={clsx(
            'max-w-sm px-3.5 py-2 text-sm leading-relaxed',
            isOwn
              ? `bg-primary-600 text-white ${ownBubbleRadius} shadow-md shadow-primary-900/30`
              : `bg-[#1e2530] text-slate-100 border border-white/[0.06] ${otherBubbleRadius} shadow-sm`
          )}>
            {renderMessageContent(msg.content)}
          </div>
        )}

        {/* Heure au hover pour les messages groupés */}
        {isGrouped && (
          <span className={clsx(
            'text-[10px] text-slate-600 mt-0.5 transition-opacity duration-150',
            showActions ? 'opacity-100' : 'opacity-0'
          )}>
            {time}{msg.edited_at && ' · modifié'}
          </span>
        )}

        {/* Réactions */}
        {reactionMap.size > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Array.from(reactionMap.entries()).map(([emoji, { count, hasReacted, names }]) => (
              <ReactionBubble key={emoji} emoji={emoji} count={count} hasReacted={hasReacted}
                onClick={() => onReact(msg.id, emoji, hasReacted)} names={names.join(', ')} />
            ))}
          </div>
        )}

        {/* Read receipts */}
        {readBy.length > 0 && (
          <ReadReceiptAvatars receipts={readBy} currentUserId={currentUserId} />
        )}
      </div>

      {/* Barre d'actions au hover */}
      <div className={clsx(
        'absolute -top-3.5 z-20 flex items-center gap-0.5',
        'bg-[#1a2030] border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-1',
        'transition-all duration-150',
        showActions ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1 pointer-events-none',
        isOwn ? 'right-10' : 'left-10'
      )}>
        {/* Quick reactions */}
        {QUICK_REACTIONS.map(emoji => {
          const r = reactionMap.get(emoji)
          return (
            <button
              key={emoji}
              onClick={() => onReact(msg.id, emoji, r?.hasReacted ?? false)}
              className={clsx(
                'w-7 h-7 flex items-center justify-center text-sm rounded-lg transition-all hover:scale-125 hover:bg-white/8',
                r?.hasReacted && 'bg-primary-600/25'
              )}
              title={emoji}
            >
              {emoji}
            </button>
          )
        })}

        <button
          onClick={() => setShowReactionPicker(v => !v)}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/8 rounded-lg transition-colors"
          title="Plus"
        >
          <Smile size={13} />
        </button>

        {showReactionPicker && (
          <div className="absolute bottom-full left-0 mb-2">
            <EmojiPicker
              onSelect={e => { onReact(msg.id, e, reactionMap.get(e)?.hasReacted ?? false); setShowReactionPicker(false) }}
              onClose={() => setShowReactionPicker(false)}
            />
          </div>
        )}

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button onClick={() => onReply(msg)}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/8 rounded-lg transition-colors"
          title="Répondre">
          <Reply size={13} />
        </button>

        {isOwn && (
          <button onClick={() => onEdit(msg)}
            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-white/8 rounded-lg transition-colors"
            title="Modifier">
            <Edit2 size={13} />
          </button>
        )}

        {canPin && (
          <button
            onClick={() => isPinned ? onUnpin(msg) : onPin(msg)}
            className={clsx(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
              isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-amber-400 hover:bg-white/8'
            )}
            title={isPinned ? 'Désépingler' : 'Épingler'}
          >
            <Pin size={13} />
          </button>
        )}

        {canDelete && (
          <button onClick={() => onDelete(msg.id)}
            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Supprimer">
            <Trash2 size={13} />
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
  const { data: teamMembers = [] } = useTeamMembers(teamId)
  const { 
    messages, receipts, pinned, typing, isLoading, sendMessage, deleteMessage, 
    clearChat, toggleReaction, markAsRead, editMessage, setTyping, clearTyping, pinMessage, unpinMessage 
  } = useTeamChat(teamId, user?.id)
  const push = usePushNotifications()

  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<TeamMessageFull | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // ── Mention state ─────────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null) // null = fermé
  const [mentionStart, setMentionStart] = useState<number>(-1)

  // ── Scroll-to-bottom button ───────────────────────────────────────────────
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [newMsgWhileScrolled, setNewMsgWhileScrolled] = useState(0)

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
      // Si on est déjà en bas → scroll auto ; sinon → badge compteur
      if (!showScrollBtn) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      } else {
        setNewMsgWhileScrolled(n => n + (messages.length - prevCountRef.current))
      }
    }
    prevCountRef.current = messages.length
  }, [messages.length, showScrollBtn])

  // ── Détecter si on est loin du bas (afficher le bouton) ──────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollBtn(distFromBottom > 120)
      if (distFromBottom <= 120) setNewMsgWhileScrolled(0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

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

  // ── Set typing indicator on input change ───────────────────────────────────
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)

    // ── Détection mention @ ───────────────────────────────────────────────
    const cursor = e.target.selectionStart ?? val.length
    // Chercher le dernier @ avant le curseur sans espace
    const textBeforeCursor = val.slice(0, cursor)
    const atMatch = textBeforeCursor.match(/@([\w\u00C0-\u017E ]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionStart(cursor - atMatch[0].length)
    } else {
      setMentionQuery(null)
      setMentionStart(-1)
    }
    
    // Set typing indicator
    if (!typingTimeoutRef.current) {
      setTyping()
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Clear typing after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      clearTyping()
      typingTimeoutRef.current = null
    }, 3000)
  }, [setTyping, clearTyping])

  // ── Handle mention selection ──────────────────────────────────────────────
  const handleMentionSelect = useCallback((member: TeamMember | 'everyone') => {
    const mention = member === 'everyone' ? '@everyone ' : `@${member.full_name} `
    const before = input.slice(0, mentionStart)
    const after = input.slice(mentionStart + 1 + (mentionQuery?.length ?? 0))
    setInput(before + mention + after)
    setMentionQuery(null)
    setMentionStart(-1)
    // Remettre le focus sur l'input
    setTimeout(() => {
      if (inputRef.current) {
        const pos = (before + mention).length
        inputRef.current.focus()
        inputRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }, [input, mentionStart, mentionQuery])

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      clearTyping()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [clearTyping])

  // ── Focus input when replying ───────────────────────────────────────────────────
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus()
    }
  }, [replyTo])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return
    await deleteMessage.mutateAsync(id)
  }, [deleteMessage])

  const handleReact = useCallback(async (messageId: string, emoji: string, hasReacted: boolean) => {
    if (!user?.id) return
    await toggleReaction.mutateAsync({ messageId, emoji, userId: user.id, hasReacted })
  }, [user?.id, toggleReaction])

  const handleEditStart = useCallback((msg: TeamMessageFull) => {
    setEditingId(msg.id)
    setEditContent(msg.content)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!editingId || !editContent.trim() || editContent === messages.find(m => m.id === editingId)?.content) {
      setEditingId(null)
      return
    }
    await editMessage.mutateAsync({ messageId: editingId, content: editContent.trim() })
    setEditingId(null)
  }, [editingId, editContent, editMessage, messages])

  const handleEditCancel = useCallback(() => {
    setEditingId(null)
    setEditContent('')
  }, [])

  // Filter typing users (exclude current user)
  const typingUsers = useMemo(() => {
    return (typing ?? []).filter(t => t.user_id !== user?.id)
  }, [typing, user?.id])

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
    <div className={clsx('flex flex-col relative', embedded ? 'h-full' : 'card')} style={embedded ? {} : { height: '580px' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="relative">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: (teamColor ?? '#16a34a') + '22' }}>
            <MessageCircle size={14} style={{ color: teamColor ?? '#16a34a' }} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0D1117] animate-pulse" style={{ backgroundColor: teamColor ?? '#16a34a' }} />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white leading-none">Chat d'équipe</h2>
          <p className="text-[10px] text-slate-600 mt-0.5">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Notifications push */}
        {typeof Notification !== 'undefined' && push.permission !== 'granted' && (
          <button onClick={push.request} title="Activer les notifications"
            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-600 hover:text-primary-400 transition-colors">
            <Bell size={13} />
          </button>
        )}
        {push.permission === 'granted' && <Bell size={12} className="text-primary-400/60" title="Notifications activées" />}
        {push.permission === 'denied' && <BellOff size={12} className="text-slate-700" title="Notifications bloquées" />}

        {/* Épinglés */}
        {pinned.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full">
            <Pin size={9} />
            {pinned.length}
          </span>
        )}

        {/* Vider (admin) */}
        {isAdmin && messages.length > 0 && (
          <button
            onClick={async () => {
              if (confirm(`Supprimer TOUS les messages (${messages.length}) ? Action irréversible.`)) {
                await clearChat.mutateAsync()
              }
            }}
            disabled={clearChat.isPending}
            className="p-1.5 rounded-lg bg-red-500/8 hover:bg-red-500/15 text-red-500/50 hover:text-red-400 transition-colors"
            title="Vider la discussion"
          >
            {clearChat.isPending ? <LoadingSpinner size="sm" /> : <Trash2 size={13} />}
          </button>
        )}
      </div>

      {/* ── Messages épinglés ── */}
      {pinned.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10 shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Pin size={11} className="text-amber-400/70" />
            <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider">Épinglés</span>
          </div>
          <div className="space-y-1">
            {pinned.slice(0, 2).map(msg => (
              <div key={msg.id} className="flex items-start gap-2 text-xs">
                <span className="text-amber-300/70 font-semibold shrink-0">{msg.sender.full_name?.split(' ')[0] ?? 'Joueur'}</span>
                <span className="text-slate-400 line-clamp-1">{msg.content}</span>
              </div>
            ))}
            {pinned.length > 2 && <span className="text-[10px] text-slate-600">+{pinned.length - 2} autres</span>}
          </div>
        </div>
      )}

      {/* ── Zone messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent"
      >
        {isLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner size="md" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10 px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <MessageCircle size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Aucun message</p>
            <p className="text-slate-600 text-xs">Soyez le premier à écrire !</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isFirstUnread = msg.id === firstUnreadIdRef.current && unreadCount > 0
            const readBy = readByMessage.get(msg.id) ?? []
            const isEditing = editingId === msg.id
            const isPinned = pinned.some(p => p.id === msg.id)

            // Regroupement : même expéditeur, moins de 5 min d'écart
            const prev = messages[idx - 1]
            const isGrouped = !isFirstUnread && !!prev
              && prev.sender_id === msg.sender_id
              && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000

            const next = messages[idx + 1]
            const isLastInGroup = !next
              || next.sender_id !== msg.sender_id
              || (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime()) >= 5 * 60 * 1000

            // Séparateur de date
            const msgDate = new Date(msg.created_at)
            const prevDate = prev ? new Date(prev.created_at) : null
            const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString()

            // Animation : seulement sur les nouveaux messages (après chargement initial)
            const isNew = idx >= messages.length - (messages.length - prevCountRef.current)

            return (
              <div
                key={msg.id}
                style={isNew ? { animation: 'msgSlideIn 0.2s ease-out both' } : undefined}
              >
                {showDateSep && <DateSeparator date={msgDate} />}
                {isFirstUnread && <UnreadSeparator count={unreadCount} />}
                <ChatMessage
                  msg={msg}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onReply={setReplyTo}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onEdit={handleEditStart}
                  onPin={msg => pinMessage.mutateAsync(msg.id)}
                  onUnpin={msg => unpinMessage.mutateAsync(msg.id)}
                  isPinned={isPinned}
                  readBy={readBy}
                  isEditing={isEditing}
                  editContent={editContent}
                  onEditChange={setEditContent}
                  onEditSave={handleEditSave}
                  onEditCancel={handleEditCancel}
                  isGrouped={isGrouped}
                  isLastInGroup={isLastInGroup}
                />
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Scroll-to-bottom button ── */}
      {showScrollBtn && (
        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-30 pointer-events-none flex justify-center">
          <button
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              setNewMsgWhileScrolled(0)
            }}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a2030] border border-white/15 shadow-xl shadow-black/40 text-xs text-slate-300 hover:text-white hover:border-white/25 transition-all hover:scale-105 active:scale-95"
          >
            {newMsgWhileScrolled > 0 && (
              <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {newMsgWhileScrolled > 99 ? '99+' : newMsgWhileScrolled}
              </span>
            )}
            <ChevronDown size={14} />
            <span>{newMsgWhileScrolled > 0 ? 'Nouveaux messages' : 'Aller en bas'}</span>
          </button>
        </div>
      )}

      {/* ── Typing indicator ── */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 shrink-0">
          <div className="flex gap-0.5 items-end">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[11px] text-slate-600">
            {typingUsers.length === 1
              ? `${typingUsers[0].profile?.full_name?.split(' ')[0] ?? "Quelqu'un"} écrit…`
              : `${typingUsers.map(u => u.profile?.full_name?.split(' ')[0] ?? "Quelqu'un").join(', ')} écrivent…`}
          </span>
        </div>
      )}

      {/* ── Reply preview ── */}
      {replyTo && (
        <div className="flex items-center gap-2.5 mx-3 mb-2 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl shrink-0">
          <div className="w-0.5 h-8 rounded-full bg-primary-500/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-primary-400 block">{replyTo.sender?.full_name ?? 'Joueur'}</span>
            <p className="text-[11px] text-slate-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)}
            className="p-1 rounded-lg hover:bg-white/8 text-slate-600 hover:text-slate-300 transition-colors shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-3 pb-3 shrink-0 relative">
        {showEmojiPicker && (
          <EmojiPicker onSelect={e => { setInput(p => p + e); inputRef.current?.focus() }} onClose={() => setShowEmojiPicker(false)} />
        )}
        {mentionQuery !== null && (
          <MentionDropdown
            members={teamMembers}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => { setMentionQuery(null); setMentionStart(-1) }}
          />
        )}

        <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-2 py-1.5 focus-within:border-primary-500/30 focus-within:bg-white/[0.06] transition-all">
          <button
            onClick={() => setShowEmojiPicker(v => !v)}
            className={clsx(
              'p-1.5 rounded-xl transition-colors shrink-0 mb-0.5',
              showEmojiPicker ? 'text-primary-400 bg-primary-500/15' : 'text-slate-600 hover:text-slate-300 hover:bg-white/8'
            )}
            title="Emojis"
          >
            <Smile size={17} />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Escape' && mentionQuery !== null) {
                e.preventDefault()
                setMentionQuery(null)
                setMentionStart(-1)
                return
              }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Écrire un message…"
            rows={1}
            className={clsx(
              'flex-1 resize-none bg-transparent text-sm text-white placeholder-slate-600',
              'focus:outline-none py-1.5 max-h-28 overflow-y-auto',
              'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'
            )}
            style={{ lineHeight: '1.5' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 112) + 'px'
            }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            className={clsx(
              'p-2 rounded-xl transition-all shrink-0 mb-0.5',
              input.trim()
                ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-900/40'
                : 'text-slate-700 cursor-not-allowed'
            )}
            title="Envoyer"
          >
            {sendMessage.isPending ? <LoadingSpinner size="sm" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
