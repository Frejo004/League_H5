import { ShieldCheck } from 'lucide-react'
import type { UserRole, TransferStatus } from '@/types/database'
import clsx from 'clsx'

// ── Badge de rôle utilisateur ────────────────────────────────────────────────
interface RoleBadgeProps {
  role: UserRole | string
  withIcon?: boolean
  className?: string
}

export function RoleBadge({ role, withIcon = true, className }: RoleBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    captain: { label: 'Capitaine', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    player: { label: 'Joueur', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    spectator: { label: 'Spectateur', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  }
  
  const cfg = config[role] ?? { label: role, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
  
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      cfg.color,
      className
    )}>
      {withIcon && <ShieldCheck size={11} />}
      {cfg.label}
    </span>
  )
}

// ── Badge de statut de transfert ─────────────────────────────────────────────
interface TransferStatusBadgeProps {
  status: TransferStatus | string
  variant?: 'default' | 'compact'
  className?: string
}

export function TransferStatusBadge({ status, variant = 'default', className }: TransferStatusBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    player_requested: { label: 'Demande envoyée', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    home_captain_approved: { label: 'Approuvé par capitaine', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    admin_approved: { label: 'Approuvé par admin', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    approved: { label: 'Approuvé', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    completed: { label: 'Terminé', color: 'bg-primary-500/15 text-primary-400 border-primary-500/30' },
    rejected: { label: 'Refusé', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    cancelled: { label: 'Annulé', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  }
  
  const cfg = config[status] ?? { label: status, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
  
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full border',
      variant === 'compact' 
        ? 'text-[10px] font-bold uppercase tracking-wide'
        : 'text-xs font-semibold',
      cfg.color,
      className
    )}>
      {cfg.label}
    </span>
  )
}

// ── Badge de statut de match ─────────────────────────────────────────────────
interface MatchStatusBadgeProps {
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | string
  className?: string
}

export function MatchStatusBadge({ status, className }: MatchStatusBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Programmé', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    live: { label: 'En direct', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    completed: { label: 'Terminé', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
    cancelled: { label: 'Annulé', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  }
  
  const cfg = config[status] ?? { label: status, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
  
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      cfg.color,
      className
    )}>
      {cfg.label}
    </span>
  )
}

// ── Badge de statut de spectateur ────────────────────────────────────────────
interface SpectatorStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | string
  className?: string
}

export function SpectatorStatusBadge({ status, className }: SpectatorStatusBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    approved: { label: 'Approuvé', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
    rejected: { label: 'Refusé', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  }
  
  const cfg = config[status] ?? { label: status, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
  
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      cfg.color,
      className
    )}>
      {cfg.label}
    </span>
  )
}
