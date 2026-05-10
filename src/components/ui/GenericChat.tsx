/**
 * GenericChat — Composant de chat réutilisable unifié
 *
 * Supporte tous les contextes : canaux globaux, DMs, groupes équipes
 * Features : réactions, replies, édition, suppression, pinned, typing,
 *            read receipts, push notifs, mentions @, link preview, modal confirm
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Send, Smile, Reply, Trash2, X, ChevronDown, Edit2,
  ExternalLink, Pin, Bell, BellOff, AlertTriangle,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Types publics
// ─────────────────────────────────────────────────────────────────────────────

export interface GenericMessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  profile?: { id: string; full_name: string | null } | null
}

export interface GenericMessageSender {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export interface GenericMessageReplyTo {
  id: string
  content: string
  sender: { id: string; full_name: string | null } | null
}

export interface GenericMessage {
  id: string
  sender_id: string
  content: string
  created_at: string
  edited_at: string | null
  reply_to_id: string | null
  sender: GenericMessageSender
  reactions: GenericMessageReaction[]
  reply_to: GenericMessageReplyTo | null
}

/** Profil minimal pour les read receipts */
export interface ReadReceiptProfile {
  user_id: string
  last_read_msg: string | null
  profile: { id: string; full_name: string | null; avatar_url: string | null }
}

/** Membre pour les mentions @ */
export interface MentionMember {
  id: string
  full_name: string | null
  avatar_url: string | null
}

/** Message épinglé */
export interface PinnedEntry {
  id: string
  content: string
  sender: { full_name: string | null } | null
}

export interface GenericChatProps {
  messages: GenericMessage[]
  currentUserId: string
  isAdmin: boolean
  isReadOnly: boolean
  isLoading: boolean

  // Actions messages
  onSend: (content: string, replyToId?: string | null) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
  onReact: (messageId: string, emoji: string, hasReacted: boolean) => void
  onMarkAsRead?: (lastMsgId: string, lastMsgAt: string) => void

  // Header
  headerTitle: string
  headerSubtitle?: string
  headerColor?: string
  /** Emoji ou initiales courtes (≤2 chars) */
  headerIcon?: string
  /** Avatar URL pour le header (DMs) */
  headerAvatar?: string | null
  /** Indicateur "en ligne" dans le header */
  headerOnline?: boolean
  /** Nombre de membres (groupes) */
  memberCount?: number
  /** Nombre total de messages affiché dans le header */
  messageCount?: number

  // Features optionnelles
  embedded?: boolean
  extraHeaderActions?: React.ReactNode

  // Read receipts (style Messenger)
  readReceipts?: ReadReceiptProfile[]

  // Typing indicators
  typingUsers?: Array<{ user_id: string; profile: { full_name: string | null } }>

  // Mentions @
  mentionMembers?: MentionMember[]

  // Messages épinglés
  pinnedMessages?: PinnedEntry[]
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void

  // Vider le chat (admin)
  onClearChat?: () => void
  isClearingChat?: boolean

  // Typing callbacks (pour les groupes)
  onTypingStart?: () => void
  onTypingStop?: () => void

  // Push notifications
  pushPermission?: NotificationPermission
  onRequestPush?: () => void

  // Séparateur non-lus
  firstUnreadId?: string | null
  unreadCount?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😲', '😢', '😡']
const GROUP_THRESHOLD_MS = 5 * 60 * 1000

const EMOJI_GROUPS = [
  { label: 'Visages', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'] },
  { label: 'Gestes',  emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄'] },
  { label: 'Foot & Sport', emojis: ['⚽','🥅','🏆','🥇','🥈','🥉','🎖️','🏅','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🏒','🏑','🏏','⛳','🏹','🎣','🛹','🛷','⛸️','🎿','⛷️','🏂','🏋️','🤸','🏃','🏃‍♀️','🎯','💪','🔥','⚡','🎉','🙌'] },
  { label: 'Objets',  emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🕹️','🗂️','📁','📂','📅','📆','🗑️','🗒️','🗄️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧱','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸'] },
  { label: 'Symboles', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(date: Date): string {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === now.toDateString()) return "Aujourd'hui"
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmModal — remplace window.confirm()
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

function ConfirmModal({ message, confirmLabel = 'Confirmer', onConfirm, onCancel, danger = false }: ConfirmModalProps) {
  // Fermeture sur Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs mx-4 bg-[#161B22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 flex flex-col items-center gap-3 text-center">
          <div className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center',
            danger ? 'bg-red-500/15' : 'bg-amber-500/15',
          )}>
            <AlertTriangle size={20} className={danger ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-white/[0.06]">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors border-r border-white/[0.06]"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              'flex-1 py-3 text-sm font-semibold transition-colors',
              danger
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EmojiPicker
// ─────────────────────────────────────────────────────────────────────────────

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 bg-[#161B22] border border-white/10 rounded-2xl shadow-2xl w-80 overflow-hidden flex flex-col max-h-[400px]"
    >
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">Émojis</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
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
// MentionDropdown
// ─────────────────────────────────────────────────────────────────────────────

function MentionDropdown({
  members, query, onSelect, onClose,
}: {
  members: MentionMember[]
  query: string
  onSelect: (member: MentionMember | 'everyone') => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lq = query.toLowerCase()
  const filtered = members.filter(m => !lq || (m.full_name ?? '').toLowerCase().includes(lq))
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
    <div ref={ref} className="absolute bottom-full mb-2 left-0 z-50 bg-[#161B22] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-64">
      <div className="px-3 py-2 border-b border-white/5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mentionner</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {items.map(item =>
          item.type === 'everyone' ? (
            <button
              key="everyone"
              onMouseDown={e => { e.preventDefault(); onSelect('everyone') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-primary-600/40 flex items-center justify-center text-xs font-bold text-primary-300 shrink-0">@</div>
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
                  {getInitials(item.member.full_name)}
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
// ReactionBubble
// ─────────────────────────────────────────────────────────────────────────────

function ReactionBubble({ emoji, count, hasReacted, onClick, names }: {
  emoji: string; count: number; hasReacted: boolean; onClick: () => void; names: string
}) {
  return (
    <button
      onClick={onClick}
      title={names}
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all',
        hasReacted
          ? 'bg-primary-600/30 border-primary-500/50 text-primary-300'
          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10',
      )}
    >
      <span>{emoji}</span>
      <span className="font-semibold tabular-nums">{count}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReadReceiptAvatars (style Messenger)
// ─────────────────────────────────────────────────────────────────────────────

function ReadReceiptAvatars({ receipts, currentUserId }: {
  receipts: ReadReceiptProfile[]
  currentUserId: string
}) {
  const others = receipts.filter(r => r.user_id !== currentUserId)
  if (others.length === 0) return null
  return (
    <div className="flex items-center gap-0.5 mt-0.5 justify-end pr-1">
      {others.slice(0, 5).map((r, i) => {
        const name = r.profile?.full_name ?? 'Joueur'
        return (
          <div
            key={r.user_id}
            title={`Vu par ${name}`}
            className="w-4 h-4 rounded-full overflow-hidden ring-1 ring-surface-card transition-transform hover:scale-125"
            style={{ marginLeft: i > 0 ? '-4px' : 0 }}
          >
            {r.profile?.avatar_url
              ? <img src={r.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full bg-primary-600/60 flex items-center justify-center text-[7px] font-bold text-white">
                  {getInitials(name)}
                </div>
              )
            }
          </div>
        )
      })}
      {others.length > 5 && <span className="text-[9px] text-slate-500 ml-1">+{others.length - 5}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DateSeparator / UnreadSeparator
// ─────────────────────────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 my-1">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap px-2">{formatDateLabel(date)}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

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
// LinkPreview
// ─────────────────────────────────────────────────────────────────────────────

function LinkPreview({ url }: { url: string }) {
  const hostname = useMemo(() => {
    try { return new URL(url).hostname.replace('www.', '') } catch { return null }
  }, [url])
  if (!hostname) return null

  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)
  const isYoutube = /youtube\.com|youtu\.be/.test(url)
  const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const ytId = ytMatch?.[1]

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-xl overflow-hidden max-w-xs border border-white/8 hover:border-white/20 transition-colors">
        <img src={url} alt="Image" className="w-full object-cover max-h-48" loading="lazy" />
      </a>
    )
  }
  if (isYoutube && ytId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-xl overflow-hidden max-w-xs border border-white/8 hover:border-white/20 transition-colors group relative">
        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="YouTube" className="w-full object-cover" loading="lazy" />
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
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 mt-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.07] hover:border-white/15 transition-all max-w-xs group">
      <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">
        <ExternalLink size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-300 truncate group-hover:text-white transition-colors">{hostname}</p>
        <p className="text-[10px] text-slate-600 truncate">{url.length > 40 ? url.slice(0, 40) + '…' : url}</p>
      </div>
    </a>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// renderMessageContent
// ─────────────────────────────────────────────────────────────────────────────

function renderMessageContent(content: string) {
  const SPLIT_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|@everyone|@[\w\u00C0-\u017E]+(?:\s[\w\u00C0-\u017E]+){0,2})/g
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
      {urls[0] && <LinkPreview url={urls[0]} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatMessage
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessageProps {
  msg: GenericMessage
  currentUserId: string
  isAdmin: boolean
  isGrouped: boolean
  isLastInGroup: boolean
  onReply: (msg: GenericMessage) => void
  onDelete: (id: string) => void
  onReact: (messageId: string, emoji: string, hasReacted: boolean) => void
  onEdit: (msg: GenericMessage) => void
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
  isPinned?: boolean
  readBy?: ReadReceiptProfile[]
  isEditing: boolean
  editContent: string
  onEditChange: (content: string) => void
  onEditSave: () => void
  onEditCancel: () => void
}

function ChatMessage({
  msg, currentUserId, isAdmin, isGrouped, isLastInGroup,
  onReply, onDelete, onReact, onEdit, onPin, onUnpin, isPinned,
  readBy = [], isEditing, editContent, onEditChange, onEditSave, onEditCancel,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const isOwn = msg.sender_id === currentUserId
  const canDelete = isOwn || isAdmin
  const canPin = isAdmin && (onPin || onUnpin)
  const senderName = msg.sender?.full_name ?? 'Joueur'
  const time = formatTime(msg.created_at)

  const reactionMap = useMemo(() => {
    const map = new Map<string, { count: number; hasReacted: boolean; names: string[] }>()
    for (const r of msg.reactions) {
      const name = r.profile?.full_name ?? 'Joueur'
      const ex = map.get(r.emoji)
      if (ex) {
        ex.count++
        if (r.user_id === currentUserId) ex.hasReacted = true
        ex.names.push(name)
      } else {
        map.set(r.emoji, { count: 1, hasReacted: r.user_id === currentUserId, names: [name] })
      }
    }
    return map
  }, [msg.reactions, currentUserId])

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.style.height = 'auto'
      editInputRef.current.style.height = Math.min(editInputRef.current.scrollHeight, 112) + 'px'
    }
  }, [isEditing])

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave() }
    if (e.key === 'Escape') onEditCancel()
  }

  const ownRadius = isGrouped && !isLastInGroup ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tr-sm'
  const otherRadius = isGrouped && !isLastInGroup ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tl-sm'

  return (
    <div
      className={clsx(
        'group relative flex gap-2.5 px-3 rounded-lg transition-colors duration-100',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        isGrouped ? 'pt-0.5 pb-0' : 'pt-2 pb-0',
        'hover:bg-white/[0.02]',
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false) }}
    >
      {/* Avatar */}
      <div className="shrink-0 w-8 mt-0.5">
        {!isGrouped && (
          msg.sender?.avatar_url
            ? <img src={msg.sender.avatar_url} alt={senderName} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
            : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600/60 to-primary-800/60 flex items-center justify-center text-xs font-bold text-primary-200 ring-1 ring-white/10">
                {getInitials(senderName)}
              </div>
            )
        )}
      </div>

      {/* Content */}
      <div className={clsx('flex flex-col min-w-0 flex-1', isOwn ? 'items-end' : 'items-start')}>
        {/* Name + time */}
        {!isGrouped && (
          <div className={clsx('flex items-baseline gap-2 mb-1', isOwn && 'flex-row-reverse')}>
            <span className={clsx('text-xs font-semibold', isOwn ? 'text-primary-300' : 'text-slate-300')}>
              {isOwn ? 'Vous' : senderName}
            </span>
            <span className="text-[10px] text-slate-600">{time}</span>
            {msg.edited_at && <span className="text-[10px] text-slate-600 italic">· modifié</span>}
            {isPinned && <span title="Épinglé"><Pin size={9} className="text-amber-400/70" /></span>}
          </div>
        )}

        {/* Reply preview */}
        {msg.reply_to && (
          <div className={clsx(
            'mb-1.5 px-3 py-1.5 rounded-xl text-xs max-w-xs',
            'border-l-2 border-primary-500/60 bg-white/[0.04] hover:bg-white/[0.07] transition-colors cursor-default',
            isOwn && 'border-r-2 border-l-0',
          )}>
            <span className="font-semibold text-primary-400 block text-[11px]">
              {msg.reply_to.sender?.full_name ?? 'Joueur'}
            </span>
            <span className="text-slate-500 line-clamp-1">{msg.reply_to.content}</span>
          </div>
        )}

        {/* Bubble */}
        {isEditing ? (
          <div className={clsx(
            'w-full max-w-sm px-3.5 py-2.5 rounded-2xl text-sm border-2',
            isOwn ? 'bg-primary-700/60 border-primary-500/50' : 'bg-[#1e2530] border-primary-500/50',
          )}>
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={e => onEditChange(e.target.value)}
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
              ? `bg-primary-600 text-white ${ownRadius} shadow-md shadow-primary-900/30`
              : `bg-[#1e2530] text-slate-100 border border-white/[0.06] ${otherRadius} shadow-sm`,
          )}>
            {renderMessageContent(msg.content)}
          </div>
        )}

        {/* Grouped time on hover */}
        {isGrouped && (
          <span className={clsx(
            'text-[10px] text-slate-600 mt-0.5 transition-opacity duration-150',
            showActions ? 'opacity-100' : 'opacity-0',
          )}>
            {time}{msg.edited_at && ' · modifié'}
          </span>
        )}

        {/* Reactions */}
        {reactionMap.size > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Array.from(reactionMap.entries()).map(([emoji, { count, hasReacted, names }]) => (
              <ReactionBubble
                key={emoji} emoji={emoji} count={count} hasReacted={hasReacted}
                onClick={() => onReact(msg.id, emoji, hasReacted)}
                names={names.join(', ')}
              />
            ))}
          </div>
        )}

        {/* Read receipts */}
        {readBy.length > 0 && (
          <ReadReceiptAvatars receipts={readBy} currentUserId={currentUserId} />
        )}
      </div>

      {/* Action bar on hover */}
      <div className={clsx(
        'absolute -top-3.5 z-20 flex items-center gap-0.5',
        'bg-[#1a2030] border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-1',
        'transition-all duration-150',
        showActions ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1 pointer-events-none',
        isOwn ? 'right-10' : 'left-10',
      )}>
        {QUICK_REACTIONS.map(emoji => {
          const r = reactionMap.get(emoji)
          return (
            <button
              key={emoji}
              onClick={() => onReact(msg.id, emoji, r?.hasReacted ?? false)}
              className={clsx(
                'w-7 h-7 flex items-center justify-center text-sm rounded-lg transition-all hover:scale-125 hover:bg-white/8',
                r?.hasReacted && 'bg-primary-600/25',
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
          title="Plus d'émojis"
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

        <button
          onClick={() => onReply(msg)}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/8 rounded-lg transition-colors"
          title="Répondre"
        >
          <Reply size={13} />
        </button>

        {isOwn && (
          <button
            onClick={() => onEdit(msg)}
            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-white/8 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 size={13} />
          </button>
        )}

        {canPin && (
          <button
            onClick={() => isPinned ? onUnpin?.(msg.id) : onPin?.(msg.id)}
            className={clsx(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
              isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-amber-400 hover:bg-white/8',
            )}
            title={isPinned ? 'Désépingler' : 'Épingler'}
          >
            <Pin size={13} />
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => onDelete(msg.id)}
            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GenericChat — composant principal exporté
// ─────────────────────────────────────────────────────────────────────────────

export function GenericChat({
  messages,
  currentUserId,
  isAdmin,
  isReadOnly,
  isLoading,
  onSend,
  onDelete,
  onEdit,
  onReact,
  onMarkAsRead,
  headerTitle,
  headerSubtitle,
  headerColor = '#3b82f6',
  headerIcon = '💬',
  headerAvatar,
  headerOnline,
  memberCount,
  messageCount,
  embedded = false,
  extraHeaderActions,
  readReceipts = [],
  typingUsers = [],
  mentionMembers = [],
  pinnedMessages = [],
  onPin,
  onUnpin,
  onClearChat,
  isClearingChat,
  onTypingStart,
  onTypingStop,
  pushPermission,
  onRequestPush,
  firstUnreadId,
  unreadCount = 0,
}: GenericChatProps) {
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<GenericMessage | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)

  // Modal de confirmation
  const [confirmState, setConfirmState] = useState<{
    message: string
    confirmLabel: string
    danger: boolean
    onConfirm: () => void
  } | null>(null)

  // Mentions @
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number>(-1)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevCountRef = useRef(0)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Marquer comme lu ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!messages.length || !onMarkAsRead) return
    const last = messages[messages.length - 1]
    onMarkAsRead(last.id, last.created_at)
  }, [messages, onMarkAsRead])

  // ── Scroll auto ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (!showScrollBtn) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      } else {
        setNewMsgCount(n => n + (messages.length - prevCountRef.current))
      }
    }
    prevCountRef.current = messages.length
  }, [messages.length, showScrollBtn])

  // ── Détection scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollBtn(dist > 120)
      if (dist <= 120) setNewMsgCount(0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // ── Focus sur reply ───────────────────────────────────────────────────────
  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  // ── Cleanup typing on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      onTypingStop?.()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [onTypingStop])

  // ── Map read receipts par message ─────────────────────────────────────────
  const readByMessage = useMemo(() => {
    const map = new Map<string, ReadReceiptProfile[]>()
    for (const r of readReceipts) {
      if (!r.last_read_msg) continue
      const existing = map.get(r.last_read_msg) ?? []
      existing.push(r)
      map.set(r.last_read_msg, existing)
    }
    return map
  }, [readReceipts])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content) return
    onSend(content, replyTo?.id ?? null)
    setInput('')
    setReplyTo(null)
    onTypingStop?.()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
  }, [input, replyTo, onSend, onTypingStop])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)

    // Détection mention @
    if (mentionMembers.length > 0) {
      const cursor = e.target.selectionStart ?? val.length
      const textBeforeCursor = val.slice(0, cursor)
      const atMatch = textBeforeCursor.match(/@([\w\u00C0-\u017E ]*)$/)
      if (atMatch) {
        setMentionQuery(atMatch[1])
        setMentionStart(cursor - atMatch[0].length)
      } else {
        setMentionQuery(null)
        setMentionStart(-1)
      }
    }

    // Typing indicator
    if (onTypingStart) {
      if (!typingTimeoutRef.current) onTypingStart()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop?.()
        typingTimeoutRef.current = null
      }, 3000)
    }
  }, [mentionMembers.length, onTypingStart, onTypingStop])

  const handleMentionSelect = useCallback((member: MentionMember | 'everyone') => {
    const mention = member === 'everyone' ? '@everyone ' : `@${member.full_name} `
    const before = input.slice(0, mentionStart)
    const after = input.slice(mentionStart + 1 + (mentionQuery?.length ?? 0))
    setInput(before + mention + after)
    setMentionQuery(null)
    setMentionStart(-1)
    setTimeout(() => {
      if (inputRef.current) {
        const pos = (before + mention).length
        inputRef.current.focus()
        inputRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }, [input, mentionStart, mentionQuery])

  const handleDelete = useCallback((id: string) => {
    setConfirmState({
      message: 'Supprimer ce message ?',
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: () => { onDelete(id); setConfirmState(null) },
    })
  }, [onDelete])

  const handleClearChat = useCallback(() => {
    setConfirmState({
      message: `Supprimer TOUS les messages (${messages.length}) ? Cette action est irréversible.`,
      confirmLabel: 'Tout supprimer',
      danger: true,
      onConfirm: () => { onClearChat?.(); setConfirmState(null) },
    })
  }, [messages.length, onClearChat])

  const handleEditStart = useCallback((msg: GenericMessage) => {
    setEditingId(msg.id)
    setEditContent(msg.content)
  }, [])

  const handleEditSave = useCallback(() => {
    if (!editingId || !editContent.trim()) { setEditingId(null); return }
    const original = messages.find(m => m.id === editingId)
    if (editContent.trim() === original?.content) { setEditingId(null); return }
    onEdit(editingId, editContent.trim())
    setEditingId(null)
  }, [editingId, editContent, messages, onEdit])

  const handleEditCancel = useCallback(() => {
    setEditingId(null)
    setEditContent('')
  }, [])

  const canWrite = !isReadOnly || isAdmin

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modal de confirmation */}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      <div
        className={clsx('flex flex-col relative', embedded ? 'h-full' : 'card')}
        style={embedded ? {} : { height: '580px' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          {/* Avatar / icône */}
          <div className="relative shrink-0">
            {headerAvatar ? (
              <img src={headerAvatar} alt={headerTitle} className="w-9 h-9 rounded-full object-cover shadow-lg" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-lg"
                style={{ backgroundColor: headerColor + '33' }}
              >
                {headerIcon}
              </div>
            )}
            {headerOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0D1117] bg-emerald-500 animate-pulse" />
            )}
          </div>

          {/* Titre + sous-titre */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white leading-tight truncate">{headerTitle}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
              {headerOnline && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 inline-block" />
                </span>
              )}
              {memberCount !== undefined && (
                <span>{memberCount} membre{memberCount !== 1 ? 's' : ''}</span>
              )}
              {memberCount !== undefined && messageCount !== undefined && (
                <span className="text-slate-700">·</span>
              )}
              {messageCount !== undefined && (
                <span>{messageCount} message{messageCount !== 1 ? 's' : ''}</span>
              )}
              {headerSubtitle && !memberCount && !messageCount && headerSubtitle}
            </p>
          </div>

          {/* Badge lecture seule */}
          {isReadOnly && !isAdmin && (
            <span className="text-[10px] text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
              Lecture seule
            </span>
          )}

          {/* Push notifications */}
          {typeof Notification !== 'undefined' && pushPermission !== undefined && pushPermission !== 'granted' && onRequestPush && (
            <button onClick={onRequestPush} title="Activer les notifications"
              className="p-1.5 rounded-lg hover:bg-white/8 text-slate-600 hover:text-primary-400 transition-colors shrink-0">
              <Bell size={13} />
            </button>
          )}
          {pushPermission === 'granted' && <span title="Notifications activées"><Bell size={12} className="text-primary-400/60 shrink-0" /></span>}
          {pushPermission === 'denied' && <span title="Notifications bloquées"><BellOff size={12} className="text-slate-700 shrink-0" /></span>}

          {/* Messages épinglés badge */}
          {pinnedMessages.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
              <Pin size={9} />
              {pinnedMessages.length}
            </span>
          )}

          {/* Vider le chat (admin) */}
          {isAdmin && onClearChat && messages.length > 0 && (
            <button
              onClick={handleClearChat}
              disabled={isClearingChat}
              className="p-1.5 rounded-lg bg-red-500/8 hover:bg-red-500/15 text-red-500/50 hover:text-red-400 transition-colors shrink-0"
              title="Vider la discussion"
            >
              <Trash2 size={13} />
            </button>
          )}

          {extraHeaderActions}
        </div>

        {/* ── Messages épinglés ── */}
        {pinnedMessages.length > 0 && (
          <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10 shrink-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Pin size={11} className="text-amber-400/70" />
              <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider">Épinglés</span>
            </div>
            <div className="space-y-1">
              {pinnedMessages.slice(0, 2).map(msg => (
                <div key={msg.id} className="flex items-start gap-2 text-xs">
                  <span className="text-amber-300/70 font-semibold shrink-0">
                    {msg.sender?.full_name?.split(' ')[0] ?? 'Joueur'}
                  </span>
                  <span className="text-slate-400 line-clamp-1">{msg.content}</span>
                </div>
              ))}
              {pinnedMessages.length > 2 && (
                <span className="text-[10px] text-slate-600">+{pinnedMessages.length - 2} autres</span>
              )}
            </div>
          </div>
        )}

        {/* ── Zone messages ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-3 relative"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10 px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl">
                {headerIcon}
              </div>
              <p className="text-slate-400 text-sm font-medium">Aucun message</p>
              <p className="text-slate-600 text-xs">
                {isReadOnly && !isAdmin ? 'Ce canal est en lecture seule.' : 'Soyez le premier à écrire !'}
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const prev = messages[idx - 1]
              const next = messages[idx + 1]
              const msgDate = new Date(msg.created_at)
              const prevDate = prev ? new Date(prev.created_at) : null
              const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString()
              const isFirstUnread = msg.id === firstUnreadId && unreadCount > 0

              const isGrouped = !isFirstUnread && !!prev
                && prev.sender_id === msg.sender_id
                && (msgDate.getTime() - new Date(prev.created_at).getTime()) < GROUP_THRESHOLD_MS

              const isLastInGroup = !next
                || next.sender_id !== msg.sender_id
                || (new Date(next.created_at).getTime() - msgDate.getTime()) >= GROUP_THRESHOLD_MS

              const isNew = idx >= messages.length - (messages.length - prevCountRef.current)
              const readBy = readByMessage.get(msg.id) ?? []
              const isPinned = pinnedMessages.some(p => p.id === msg.id)

              return (
                <div
                  key={msg.id}
                  style={isNew ? { animation: 'msgSlideIn 0.2s ease-out both' } : undefined}
                >
                  {showDateSep && <DateSeparator date={msgDate} />}
                  {isFirstUnread && <UnreadSeparator count={unreadCount} />}
                  <ChatMessage
                    msg={msg}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    isGrouped={isGrouped}
                    isLastInGroup={isLastInGroup}
                    onReply={setReplyTo}
                    onDelete={handleDelete}
                    onReact={onReact}
                    onEdit={handleEditStart}
                    onPin={onPin}
                    onUnpin={onUnpin}
                    isPinned={isPinned}
                    readBy={readBy}
                    isEditing={editingId === msg.id}
                    editContent={editContent}
                    onEditChange={setEditContent}
                    onEditSave={handleEditSave}
                    onEditCancel={handleEditCancel}
                  />
                </div>
              )
            })
          )}

          {/* Scroll-to-bottom */}
          {showScrollBtn && (
            <div className="sticky bottom-3 z-20 flex justify-center pointer-events-none">
              <button
                onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setNewMsgCount(0) }}
                className="pointer-events-auto flex items-center gap-1 px-2 py-1 rounded-full bg-[#1a2030]/90 border border-white/10 shadow-lg text-slate-400 hover:text-white hover:border-white/20 transition-all active:scale-95 backdrop-blur-sm"
                style={{ animation: 'msgSlideIn 0.15s ease-out both' }}
              >
                {newMsgCount > 0 && (
                  <span className="bg-primary-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                    {newMsgCount > 99 ? '99+' : newMsgCount}
                  </span>
                )}
                <ChevronDown size={12} />
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

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
              <span className="text-[11px] font-semibold text-primary-400 block">
                {replyTo.sender?.full_name ?? 'Joueur'}
              </span>
              <p className="text-[11px] text-slate-500 truncate">{replyTo.content}</p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1 rounded-lg hover:bg-white/8 text-slate-600 hover:text-slate-300 transition-colors shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Input ── */}
        <div className="px-3 pb-3 shrink-0 relative">
          {showEmojiPicker && (
            <EmojiPicker
              onSelect={e => { setInput(p => p + e); inputRef.current?.focus() }}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
          {mentionQuery !== null && mentionMembers.length > 0 && (
            <MentionDropdown
              members={mentionMembers}
              query={mentionQuery}
              onSelect={handleMentionSelect}
              onClose={() => { setMentionQuery(null); setMentionStart(-1) }}
            />
          )}

          {canWrite ? (
            <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-2 py-1.5 focus-within:border-primary-500/30 focus-within:bg-white/[0.06] transition-all">
              <button
                onClick={() => setShowEmojiPicker(v => !v)}
                className={clsx(
                  'p-1.5 rounded-xl transition-colors shrink-0 mb-0.5',
                  showEmojiPicker ? 'text-primary-400 bg-primary-500/15' : 'text-slate-600 hover:text-slate-300 hover:bg-white/8',
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
                className="flex-1 resize-none bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none py-1.5 max-h-28 overflow-y-auto"
                style={{ lineHeight: '1.5', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 112) + 'px'
                }}
              />

              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={clsx(
                  'p-2 rounded-xl transition-all shrink-0 mb-0.5',
                  input.trim()
                    ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-900/40'
                    : 'text-slate-700 cursor-not-allowed',
                )}
                title="Envoyer"
              >
                <Send size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-3 text-xs text-slate-600 gap-2">
              <Pin size={12} />
              Ce canal est en lecture seule
            </div>
          )}
        </div>
      </div>
    </>
  )
}
