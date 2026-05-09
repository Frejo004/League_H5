/**
 * ChatPage — Page de chat de groupe
 *
 * - Sélection automatique de la première équipe au chargement
 * - Desktop : deux colonnes (liste | chat)
 * - Mobile  : vue liste puis vue chat
 * - TeamChat monté UNE SEULE FOIS pour éviter les conflits de channel realtime
 */

import { useState, useEffect } from 'react'
import { MessageCircle, Users, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useChatUnread } from '@/hooks/useChatUnread'
import { TeamChat } from '@/components/ui/TeamChat'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { TeamUnread } from '@/hooks/useChatUnread'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'à l\'instant'
  if (mins < 60)  return `${mins}min`
  if (hours < 24) return `${hours}h`
  return `${days}j`
}

// ─────────────────────────────────────────────────────────────────────────────
// Liste des équipes
// ─────────────────────────────────────────────────────────────────────────────

function TeamList({
  teams,
  selected,
  onSelect,
}: {
  teams: TeamUnread[]
  selected: TeamUnread | null
  onSelect: (t: TeamUnread) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-surface-border shrink-0">
        <h1 className="text-lg font-black text-white flex items-center gap-2">
          <MessageCircle size={18} className="text-primary-400" />
          Messages
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {teams.length} groupe{teams.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-16">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
              <Users size={24} className="text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Aucune équipe</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vous n'êtes membre d'aucune équipe pour le moment.
            </p>
          </div>
        ) : (
          teams.map((team) => (
            <button
              key={team.teamId}
              onClick={() => onSelect(team)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                'border-b border-surface-border/50',
                selected?.teamId === team.teamId
                  ? 'bg-primary-600/10 border-l-2 border-l-primary-500'
                  : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
              )}
            >
              <div className="relative shrink-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-black overflow-hidden"
                  style={{ backgroundColor: team.teamColor }}
                >
                  {team.logo_url
                    ? <img src={team.logo_url} alt={team.teamName} className="w-full h-full object-contain" />
                    : team.teamName[0].toUpperCase()
                  }
                </div>
                {team.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-[#0D1117] animate-pulse" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
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
                  'text-xs truncate',
                  team.unread > 0 ? 'text-slate-200 font-medium' : 'text-slate-500'
                )}>
                  {team.lastMessage ?? 'Aucun message'}
                </p>
              </div>

              {team.unread > 0 && (
                <span
                  className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary-500/20"
                  style={{ backgroundColor: '#C8F135', color: '#0D1117' }}
                >
                  {team.unread > 99 ? '99+' : team.unread}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────

export function ChatPage() {
  const { user, isAdmin } = useAuth()
  const { data: teams, isLoading } = useChatUnread(user?.id, isAdmin)
  const [selected, setSelected] = useState<TeamUnread | null>(null)
  // true = on est en vue chat sur mobile
  const [mobileShowChat, setMobileShowChat] = useState(false)

  // Sélection automatique de la première équipe dès le chargement
  useEffect(() => {
    if (selected) return
    if (teams && teams.length > 0) {
      setSelected(teams[0])
      setMobileShowChat(true) // ← ouvre directement le chat sur mobile aussi
    }
  }, [teams, selected])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const teamList = teams ?? []

  const handleSelect = (team: TeamUnread) => {
    setSelected(team)
    setMobileShowChat(true)
  }

  // ── Chat header mobile (nom de l'équipe + bouton retour) ─────────────────
  const MobileChatHeader = selected ? (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-surface-border shrink-0">
      <button
        onClick={() => setMobileShowChat(false)}
        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
      </button>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0 overflow-hidden"
        style={{ backgroundColor: selected.teamColor }}
      >
        {selected.logo_url
          ? <img src={selected.logo_url} alt={selected.teamName} className="w-full h-full object-contain" />
          : selected.teamName[0].toUpperCase()
        }
      </div>
      <span className="font-bold text-white text-sm">{selected.teamName}</span>
      <span className="w-2 h-2 rounded-full animate-pulse ml-auto" style={{ backgroundColor: selected.teamColor }} />
    </div>
  ) : null

  return (
    <>
      {/* ══════════════════════════════════════════
          MOBILE
          ══════════════════════════════════════════ */}
      <div className="lg:hidden h-[calc(100vh-8rem)]">
        {mobileShowChat && selected ? (
          /* Vue chat mobile */
          <div className="flex flex-col h-full card p-0 overflow-hidden">
            {MobileChatHeader}
            <div className="flex-1 overflow-hidden">
              <TeamChat
                teamId={selected.teamId}
                teamColor={selected.teamColor}
                teamName={selected.teamName}
                embedded
              />
            </div>
          </div>
        ) : (
          /* Vue liste mobile */
          <div className="h-full card p-0 overflow-hidden">
            <TeamList teams={teamList} selected={selected} onSelect={handleSelect} />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP — deux colonnes
          TeamChat monté UNE SEULE FOIS ici
          ══════════════════════════════════════════ */}
      <div className="hidden lg:flex h-[calc(100vh-8rem)] card p-0 overflow-hidden">
        {/* Colonne gauche — liste */}
        <div className="w-80 shrink-0 flex flex-col border-r border-surface-border">
          <TeamList teams={teamList} selected={selected} onSelect={handleSelect} />
        </div>

        {/* Colonne droite — chat */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selected ? (
            <TeamChat
              teamId={selected.teamId}
              teamColor={selected.teamColor}
              teamName={selected.teamName}
              embedded
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-600/20 flex items-center justify-center">
                <MessageCircle size={28} className="text-primary-400" />
              </div>
              <p className="text-white font-bold text-base">Sélectionnez une équipe</p>
              <p className="text-slate-500 text-sm mt-1">
                Choisissez un groupe dans la liste pour commencer à discuter.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
