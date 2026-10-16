import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, Calendar, Shield, Trophy, Crown } from 'lucide-react'
import { clsx } from 'clsx'
import { LineupStatusBadge } from '@/components/dashboard/NextMatchCountdown'
import type { MatchWithTeams } from '@/hooks/useMatches'

interface FloatingActionMenuProps {
  isAdmin?: boolean;
  isCaptain?: boolean;
  adminData?: {
    completedCount: number;
    teamsCount: number;
    pendingSpectatorsCount: number;
  };
  captainData?: {
    myTeamId: string | null;
    nextMatch?: MatchWithTeams | null;
  };
}

export function FloatingActionMenu({ isAdmin, isCaptain, adminData, captainData }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu au clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (!isAdmin && !isCaptain) return null

  const adminActions = adminData ? [
    { label: 'Matchs', sub: `${adminData.completedCount} terminés`, icon: Calendar, to: '/admin?tab=schedule', color: '#15803d' },
    { label: 'Équipes', sub: `${adminData.teamsCount} équipes`, icon: Shield, to: '/admin?tab=teams', color: '#d9a441' },
    { label: 'Spectateurs', sub: `${adminData.pendingSpectatorsCount} en attente`, icon: Users, to: '/admin?tab=spectators', color: '#10b981', alert: adminData.pendingSpectatorsCount > 0 },
    { label: 'Saisons', sub: 'Gérer', icon: Trophy, to: '/admin?tab=seasons', color: '#f59e0b' },
  ] : []

  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end" ref={menuRef}>
      {/* Menu Backdrop & Items */}
      <div 
        className={clsx(
          "mb-4 flex flex-col items-end space-y-3 transition-all duration-300 origin-bottom-right",
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 pointer-events-none translate-y-4"
        )}
      >
        {isAdmin && adminData && (
          <div className="bg-surface-card/90 backdrop-blur-md border border-surface-border shadow-2xl rounded-2xl p-4 w-64 space-y-2 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-border">
              <Shield size={14} className="text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">Admin</span>
            </div>
            {adminActions.map(({ label, sub, icon: Icon, to, color, alert }, idx) => (
              <Link 
                key={to} 
                to={to}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-raised transition-colors group relative"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {alert && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                <div className="p-2 rounded-lg shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary leading-tight">{label}</p>
                  <p className="text-[10px] text-text-muted truncate">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {isCaptain && captainData && (
          <div className="bg-surface-card/90 backdrop-blur-md border border-surface-border shadow-2xl rounded-2xl p-4 w-64 space-y-2 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-border">
              <Crown size={14} className="text-primary-400" />
              <span className="text-xs font-black uppercase tracking-widest text-primary-400">Capitaine</span>
            </div>
            
            <Link to="/captain" onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 transition-colors group">
              <div className="p-2 rounded-lg bg-primary-500/20 shrink-0 transition-transform group-hover:scale-110">
                <Users size={16} className="text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary leading-tight">Mon équipe</p>
                <p className="text-[10px] text-text-muted">Gérer les joueurs</p>
              </div>
            </Link>

            {captainData.nextMatch && captainData.myTeamId && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-raised/50 border border-surface-border">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1.5">Compo J{captainData.nextMatch.matchday}</p>
                  <LineupStatusBadge matchId={captainData.nextMatch.id} teamId={captainData.myTeamId} isCaptain />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 focus:outline-none hover:scale-105",
          isOpen 
            ? "bg-surface-raised text-text-primary rotate-45" 
            : "bg-primary-500 text-white"
        )}
      >
        <Plus size={24} className="transition-transform" />
      </button>
    </div>
  )
}
