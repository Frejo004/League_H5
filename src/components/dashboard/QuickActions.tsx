import { Link } from 'react-router-dom'
import { Crown, Users, Calendar, Shield, Trophy } from 'lucide-react'
import { LineupStatusBadge } from '@/components/dashboard/NextMatchCountdown'
import type { MatchWithTeams } from '@/hooks/useMatches'
import { useMyTeam } from '@/hooks/useMyTeam'

// ── Raccourcis capitaine ──────────────────────────────────────────────────────
export function CaptainQuickActions({ myTeam, nextMatch, myTeamId }: {
  myTeam: ReturnType<typeof useMyTeam>['myTeam']
  nextMatch?: MatchWithTeams
  myTeamId: string | null
}) {
  return (
    <div className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Crown size={13} className="text-primary-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">Espace Capitaine</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/captain"
          className="flex items-center gap-2 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-colors group">
          <Users size={14} className="text-primary-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-primary truncate">Mon équipe</p>
            {myTeam && <p className="text-[10px] text-text-muted truncate">{myTeam.name}</p>}
          </div>
        </Link>
        {nextMatch && myTeamId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-raised/50 border border-surface-border">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Compo J{nextMatch.matchday}</p>
              <LineupStatusBadge matchId={nextMatch.id} teamId={myTeamId} isCaptain />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Raccourcis admin ──────────────────────────────────────────────────────────
export function AdminQuickActions({ completedCount, teamsCount, pendingSpectatorsCount }: {
  completedCount: number; teamsCount: number; pendingSpectatorsCount: number
}) {
  const actions = [
    { label: 'Matchs', sub: `${completedCount} terminés`, icon: Calendar, to: '/admin?tab=schedule', color: '#15803d' },
    { label: 'Équipes', sub: `${teamsCount} équipes`, icon: Shield, to: '/admin?tab=teams', color: '#d9a441' },
    { label: 'Spectateurs', sub: `${pendingSpectatorsCount} en attente`, icon: Users, to: '/admin?tab=spectators', color: '#10b981', alert: pendingSpectatorsCount > 0 },
    { label: 'Saisons', sub: 'Gérer', icon: Trophy, to: '/admin?tab=seasons', color: '#f59e0b' },
  ]
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ label, sub, icon: Icon, to, color, alert }) => (
          <Link key={to} to={to}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-raised/50 border border-surface-border hover:bg-surface-raised transition-colors group relative">
            {alert && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20` }}>
              <Icon size={13} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{label}</p>
              <p className="text-[10px] text-text-muted truncate">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
