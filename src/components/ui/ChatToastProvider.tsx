/**
 * ChatToastProvider — Notifications toast pour TOUS les types de messages
 *
 * Couvre :
 *   - team_messages (groupes équipes)
 *   - channel_messages (canaux globaux)
 *   - dm_messages (messages directs)
 *
 * Règles :
 *   - Pas de toast pour ses propres messages
 *   - Pas de toast si l'utilisateur est déjà sur la page /chat
 *   - Stack max 4 toasts, auto-dismiss 5s, pause au hover
 *   - Clic → navigue vers /chat
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ToastKind = 'team' | 'channel' | 'dm'

interface ChatToast {
  id: string
  kind: ToastKind
  /** Pour les équipes : teamId ; pour les canaux : channelId ; pour les DMs : conversationId */
  contextId: string
  contextName: string
  contextColor: string
  senderName: string
  senderAvatar: string | null
  preview: string
  createdAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de fetch
// ─────────────────────────────────────────────────────────────────────────────

async function fetchUserTeams(userId: string) {
  const [{ data: playerTeams }, { data: captainTeams }] = await Promise.all([
    supabase
      .from('players')
      .select('team_id, teams!players_team_id_fkey(id, name, color)')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase.from('teams').select('id, name, color').eq('captain_id', userId),
  ])

  const result: { id: string; name: string; color: string }[] = []
  const seen = new Set<string>()

  for (const row of playerTeams ?? []) {
    const typedRow = row as { 
      team_id: string; 
      teams?: { id: string; name: string; color: string }[] | null 
    }
    const teamsArray = typedRow.teams
    const t = teamsArray?.[0]
    if (t && !seen.has(t.id)) { seen.add(t.id); result.push(t) }
  }

  for (const t of (captainTeams ?? []) as { id: string; name: string; color: string }[]) {
    if (!seen.has(t.id)) { seen.add(t.id); result.push(t) }
  }

  return result
}

async function fetchVisibleChannels(userId: string) {
  // Canaux visibles : général (tout le monde) + capitaines (si capitaine ou admin)
  const { data: channels } = await supabase
    .from('global_channels')
    .select('id, name, color, slug')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  const { data: captainTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('captain_id', userId)
    .limit(1)

  const isAdmin = profile != null && profile.role === 'admin'

  const isCaptain = (captainTeam?.length ?? 0) > 0

  return (channels ?? []).filter(c => {
    const channel = c as { id: string; name: string; color: string; slug: string }
    if (channel.slug === 'captains') return isAdmin || isCaptain
    return true
  }) as { id: string; name: string; color: string; slug: string }[]

}
function truncate(text: string, max = 80) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ─────────────────────────────────────────────────────────────────────────────
// ToastItem
// ─────────────────────────────────────────────────────────────────────────────

function ToastItem({
  toast, onDismiss, onClick,
}: {
  toast: ChatToast
  onDismiss: (id: string) => void
  onClick: (toast: ChatToast) => void
}) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDismissRef = useRef(onDismiss)
  useEffect(() => { onDismissRef.current = onDismiss }, [onDismiss])

  const handleDismiss = useCallback(() => {
    if (leaving) return
    setLeaving(true)
    setTimeout(() => onDismissRef.current(toast.id), 300)
  }, [toast.id, leaving])

  const startTimer = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => handleDismiss(), delay)
  }, [handleDismiss])

  useEffect(() => { const t = setTimeout(() => setVisible(true), 10); return () => clearTimeout(t) }, [])
  useEffect(() => { startTimer(5000); return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = toast.senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const kindLabel: Record<ToastKind, string> = {
    team: toast.contextName,
    channel: `#${toast.contextName}`,
    dm: 'Message direct',
  }

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 w-80 rounded-2xl p-3.5 cursor-pointer',
        'border shadow-2xl transition-all duration-300 ease-out select-none',
        visible && !leaving
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95',
      )}
      style={{
        backgroundColor: 'var(--color-chat-panel)',
        borderColor: 'rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
      onClick={() => onClick(toast)}
      onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
      onMouseLeave={() => startTimer(2000)}
    >
      {/* Barre colorée gauche */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: toast.contextColor }}
      />

      {/* Avatar */}
      <div className="shrink-0 ml-2">
        {toast.senderAvatar ? (
          <img src={toast.senderAvatar} alt={toast.senderName} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white/10"
            style={{ backgroundColor: toast.contextColor + '40', color: toast.contextColor }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-bold text-white truncate">{toast.senderName}</span>
          <span className="text-[10px] text-slate-500 shrink-0">·</span>
          <span className="text-[10px] font-semibold truncate shrink-0" style={{ color: toast.contextColor }}>
            {kindLabel[toast.kind]}
          </span>
        </div>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{toast.preview}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <MessageCircle size={10} className="text-slate-600" />
          <span className="text-[10px] text-slate-600">Nouveau message</span>
        </div>
      </div>

      {/* Fermer */}
      <button
        onClick={e => { e.stopPropagation(); handleDismiss() }}
        className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-600 hover:text-slate-300 transition-colors"
      >
        <X size={12} />
      </button>

      {/* Barre de progression */}
      <div className="absolute bottom-0 left-3 right-3 h-px rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ backgroundColor: toast.contextColor, animation: 'toast-progress 5s linear forwards' }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider principal
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TOASTS = 4

export function ChatToastProvider() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [toasts, setToasts] = useState<ChatToast[]>([])

  const locationRef = useRef(location.pathname)
  useEffect(() => { locationRef.current = location.pathname }, [location.pathname])

  const addToast = useCallback((toast: ChatToast) => {
    setToasts(prev => [toast, ...prev].slice(0, MAX_TOASTS))
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const channels: ReturnType<typeof supabase.channel>[] = []

    async function setup() {
      const [teams, globalChannels] = await Promise.all([
        fetchUserTeams(user!.id),
        fetchVisibleChannels(user!.id),
      ])
      if (cancelled) return

      const teamIds = new Set(teams.map(t => t.id))
      const teamMap = new Map(teams.map(t => [t.id, t]))
      const channelIds = new Set(globalChannels.map(c => c.id))
      const channelMap = new Map(globalChannels.map(c => [c.id, c]))

      // ── Canal 1 : team_messages ──────────────────────────────────────────
      const teamCh = supabase
        .channel(`toast-teams-${user!.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, async payload => {
          const msg = payload.new as { id: string; team_id: string; sender_id: string; content: string }
          if (msg.sender_id === user!.id) return
          if (!teamIds.has(msg.team_id)) return
          if (locationRef.current === '/chat') return

          const { data: sender } = await supabase
            .from('profiles').select('full_name, avatar_url').eq('id', msg.sender_id).maybeSingle()
          const team = teamMap.get(msg.team_id)
          if (!team) return

          const senderProfile = sender ?? { full_name: 'Joueur', avatar_url: null }

          addToast({
            id: `toast-team-${msg.id}`,
            kind: 'team',
            contextId: msg.team_id,
            contextName: team.name,
            contextColor: team.color,
            senderName: senderProfile.full_name,
            senderAvatar: senderProfile.avatar_url,
            preview: truncate(msg.content),
            createdAt: Date.now(),
          })
        })
        .subscribe()
      channels.push(teamCh)

      // ── Canal 2 : channel_messages ───────────────────────────────────────
      const channelCh = supabase
        .channel(`toast-channels-${user!.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channel_messages' }, async payload => {
          const msg = payload.new as { id: string; channel_id: string; sender_id: string; content: string }
          if (msg.sender_id === user!.id) return
          if (!channelIds.has(msg.channel_id)) return
          if (locationRef.current === '/chat') return

          const { data: sender } = await supabase
            .from('profiles').select('full_name, avatar_url').eq('id', msg.sender_id).maybeSingle()
          const channel = channelMap.get(msg.channel_id)
          if (!channel) return

          const senderProfile = sender ?? { full_name: 'Joueur', avatar_url: null }

          addToast({
            id: `toast-ch-${msg.id}`,
            kind: 'channel',
            contextId: msg.channel_id,
            contextName: channel.name,
            contextColor: channel.color,
            senderName: senderProfile.full_name,
            senderAvatar: senderProfile.avatar_url,
            preview: truncate(msg.content),
            createdAt: Date.now(),
          })
        })
        .subscribe()
      channels.push(channelCh)

      // ── Canal 3 : dm_messages ────────────────────────────────────────────
      const dmCh = supabase
        .channel(`toast-dms-${user!.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, async payload => {
          const msg = payload.new as { id: string; conversation_id: string; sender_id: string; content: string }
          if (msg.sender_id === user!.id) return
          if (locationRef.current === '/chat') return

          // Vérifier que l'user fait partie de cette conversation
          const { data: conv } = await supabase
            .from('dm_conversations')
            .select('user_a, user_b')
            .eq('id', msg.conversation_id)
            .maybeSingle()
          if (!conv) return
          type DmConversation = { user_a: string; user_b: string }
          const conversation = conv as DmConversation
          if (conversation.user_a !== user!.id && conversation.user_b !== user!.id) return

          const { data: sender } = await supabase
            .from('profiles').select('full_name, avatar_url').eq('id', msg.sender_id).maybeSingle()

          const senderProfile = sender ?? { full_name: 'Joueur', avatar_url: null }

          addToast({
            id: `toast-dm-${msg.id}`,
            kind: 'dm',
            contextId: msg.conversation_id,
            contextName: senderProfile.full_name,
            contextColor: '#3b82f6',
            senderName: senderProfile.full_name,
            senderAvatar: senderProfile.avatar_url,
            preview: truncate(msg.content),
            createdAt: Date.now(),
          })
        })
        .subscribe()
      channels.push(dmCh)
    }

    setup()
    return () => {
      cancelled = true
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [user?.id, addToast])

  const handleDismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleClick = useCallback((toast: ChatToast) => {
    navigate('/chat')
    setToasts(prev => prev.filter(t => t.id !== toast.id))
  }, [navigate])

  if (!user || toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; opacity: 1; }
          to   { width: 0%;   opacity: 0.4; }
        }
      `}</style>
      <div
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications de chat"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={handleDismiss} onClick={handleClick} />
          </div>
        ))}
      </div>
    </>
  )
}
