import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Calendar, CheckCircle2, Star,
  UserPlus, AlertTriangle, X, ChevronRight, CheckCheck, Users, UserCheck
} from 'lucide-react'
import { clsx } from 'clsx'
import type { Notification, NotifType } from '@/hooks/useNotifications'

// ─────────────────────────────────────────────────────────────────────────────
// Config visuelle par type
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, {
  icon: typeof Bell
  color: string
  bg: string
  border: string
}> = {
  match_upcoming:    { icon: Calendar,      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  match_completed:   { icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  mvp_vote_open:     { icon: Star,          color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  invite_pending:    { icon: UserPlus,      color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  invite_expiring:   { icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  spectator_request: { icon: Users,         color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  tactique_selected: { icon: UserCheck,     color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'à l\'instant'
  if (mins < 60)  return `il y a ${mins}min`
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${days}j`
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications: Notification[]
  onClose: () => void
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}

export function NotificationPanel({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Ferme au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Ferme sur Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const ACCENT = '#C8F135'

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] z-50 animate-scale-in origin-top-right"
      style={{
        backgroundColor: '#161B22',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-slate-400" />
          <span className="text-sm font-bold text-white">Notifications</span>
          {notifications.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
              style={{ backgroundColor: ACCENT, color: '#0D1117' }}
            >
              {notifications.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Tout marquer comme lu */}
          {notifications.length > 0 && (
            <button
              onClick={() => { onMarkAllRead(); onClose() }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold
                         text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Tout marquer comme lu"
            >
              <CheckCheck size={13} />
              <span>Tout lire</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <CheckCheck size={16} className="text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Tout est à jour</p>
            <p className="text-xs text-slate-600">Aucune notification non lue</p>
          </div>
        ) : (
          <div className="py-1">
            {notifications.map((notif, i) => {
              const cfg = TYPE_CONFIG[notif.type]
              const Icon = cfg.icon
              return (
                <Link
                  key={notif.id}
                  to={notif.href}
                  onClick={() => { onMarkRead(notif.id); onClose() }}
                  className={clsx(
                    'flex items-start gap-3 px-4 py-3 transition-colors group',
                    'hover:bg-white/[0.03]',
                    i < notifications.length - 1 && 'border-b border-white/[0.04]'
                  )}
                >
                  {/* Icône */}
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border',
                    cfg.bg, cfg.border
                  )}>
                    <Icon size={14} className={cfg.color} />
                  </div>

                  {/* Texte */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                      {notif.urgent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>

                  {/* Flèche */}
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 shrink-0 mt-1 transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          className="px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => { onMarkAllRead(); onClose() }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                       text-xs font-semibold transition-colors"
            style={{ color: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(200,241,53,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <CheckCheck size={13} />
            Tout marquer comme lu
          </button>
        </div>
      )}
    </div>
  )
}
