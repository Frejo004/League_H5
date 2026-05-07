/**
 * ChatPanel — Panneau de chat accessible depuis le header
 *
 * - Liste les équipes de l'user avec badge de non-lus
 * - Sélection d'une équipe → affiche le TeamChat en plein panneau
 * - Bouton retour pour revenir à la liste
 * - Fermeture au clic extérieur ou Escape
 */

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, ArrowLeft, X, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { TeamChat } from '@/components/ui/TeamChat'
import { useChatUnread } from '@/hooks/useChatUnread'
import type { TeamUnread } from '@/hooks/useChatUnread'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `${mins}min`
  if (hours < 24) return `${hours}h`
  return `${days}j`
}

interface ChatPanelProps {
  userId: string
  onClose: () => void
  /** En mode mobile le panneau est positionné en fixed par le parent */
  mobile?: boolean
}

export function ChatPanel({ userId, onClose, mobile = false }: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamUnread | null>(null)
  const { isAdmin } = useAuth()
  const { data: teams, isLoading } = useChatUnread(userId, isAdmin)

  // Ferme au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', h), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h) }
  }, [onClose])

  // Ferme sur Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const totalUnread = teams?.reduce((s, t) => s + t.unread, 0) ?? 0

  return (
    <div
      ref={panelRef}
      className={clsx(
        'z-50 flex flex-col animate-scale-in',
        mobile
          ? 'w-full h-full rounded-2xl'
          : 'absolute right-0 top-full mt-2 origin-top-right'
      )}
      style={{
        ...(mobile ? {} : {
          width: selectedTeam ? 420 : 320,
          height: selectedTeam ? 600 : 'auto',
          maxHeight: '85vh',
          transition: 'width 0.25s ease, height 0.25s ease',
        }),
        backgroundColor: '#161B22',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* ── Header du panneau ── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          {selectedTeam ? (
            <button
              onClick={() => setSelectedTeam(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors mr-1"
              aria-label="Retour"
            >
              <ArrowLeft size={15} />
            </button>
          ) : (
            <MessageCircle size={14} className="text-primary-400" />
          )}

          <span className="text-sm font-bold text-white">
            {selectedTeam ? selectedTeam.teamName : 'Messages'}
          </span>

          {!selectedTeam && totalUnread > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
              style={{ backgroundColor: '#C8F135', color: '#0D1117' }}
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}

          {selectedTeam && (
            <span
              className="w-2 h-2 rounded-full animate-pulse ml-1"
              style={{ backgroundColor: selectedTeam.teamColor }}
            />
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Contenu ── */}
      {selectedTeam ? (
        /* Vue chat d'une équipe */
        <div className="flex-1 overflow-hidden p-3">
          <TeamChat
            teamId={selectedTeam.teamId}
            teamColor={selectedTeam.teamColor}
            teamName={selectedTeam.teamName}
            embedded
          />
        </div>
      ) : (
        /* Liste des équipes */
        <div className="overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="md" />
            </div>
          ) : !teams || teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Users size={20} className="text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Aucune équipe</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vous n'êtes membre d'aucune équipe pour le moment.
              </p>
            </div>
          ) : (
            <div className="py-1">
              {teams.map((team, i) => (
                <button
                  key={team.teamId}
                  onClick={() => setSelectedTeam(team)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]',
                    i < teams.length - 1 && 'border-b border-white/[0.04]'
                  )}
                >
                  {/* Logo / couleur équipe */}
                  <div className="relative shrink-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black overflow-hidden"
                      style={{ backgroundColor: team.teamColor }}
                    >
                      {team.logo_url
                        ? <img src={team.logo_url} alt={team.teamName} className="w-full h-full object-contain" />
                        : team.teamName[0].toUpperCase()
                      }
                    </div>
                    {team.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-[#161B22] animate-pulse" />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={clsx(
                        'text-sm truncate transition-colors',
                        team.unread > 0 ? 'font-black text-white' : 'font-semibold text-slate-400'
                      )}>
                        {team.teamName}
                      </span>
                      {team.lastMessageAt && (
                        <span className={clsx(
                          'text-[10px] shrink-0',
                          team.unread > 0 ? 'text-primary-400 font-bold' : 'text-slate-600'
                        )}>
                          {timeAgo(team.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className={clsx(
                      'text-xs truncate mt-0.5',
                      team.unread > 0 ? 'text-slate-200 font-medium' : 'text-slate-500'
                    )}>
                      {team.lastMessage ?? 'Aucun message'}
                    </p>
                  </div>

                  {/* Badge non-lus */}
                  {team.unread > 0 && (
                    <span
                      className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary-500/20"
                      style={{ backgroundColor: '#C8F135', color: '#0D1117' }}
                    >
                      {team.unread > 99 ? '99+' : team.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
