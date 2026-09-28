import { Calendar, Target, Zap, Star, Shield, BarChart2, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { usePlayerDiscipline } from '@/hooks/useDisciplinaryStats'

// ── Mes stats perso (joueur / capitaine) ──────────────────────────────────────
export function MyStatsCard({ playerId, seasonId }: { playerId: string; seasonId: string }) {
  const { data: profile, isLoading } = usePlayerProfile(playerId)
  const { data: mvpData } = usePlayerMvp(playerId, seasonId)
  const { data: discipline } = usePlayerDiscipline(playerId, seasonId)

  if (isLoading) return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4 animate-pulse">
      <div className="h-3 w-24 bg-surface-raised rounded mb-4" />
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-surface-raised rounded-xl" />)}
      </div>
    </div>
  )

  if (!profile) return null

  const stats = [
    { label: 'Matchs', value: profile.matches_played, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Buts', value: profile.goals, icon: Target, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Passes', value: profile.assists, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'MVP', value: mvpData?.total_mvp ?? 0, icon: Star, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Cartons', value: (discipline?.yellow_cards ?? 0) + (discipline?.red_cards ?? 0), icon: Shield, color: 'text-red-400', bg: 'bg-red-400/10', sub: `${discipline?.yellow_cards ?? 0}J / ${discipline?.red_cards ?? 0}R` },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 100% 0%, ${profile.team.color}10 0%, transparent 60%)` }} />
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={12} className="text-text-muted" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mes stats · Saison</span>
        </div>
        <Link to={`/players/${profile.slug || profile.id}`}
          className="text-[10px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors">
          Profil complet <ChevronRight size={10} />
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-1.5 relative">
        {stats.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className={clsx('rounded-xl p-2 text-center flex flex-col items-center justify-center min-w-0', bg)}>
            <Icon size={12} className={clsx('mb-1', color)} />
            <p className="text-lg font-black text-text-primary tabular-nums leading-none">{value}</p>
            <p className="text-[8px] text-text-muted uppercase tracking-wider mt-0.5 truncate w-full">{label}</p>
            {sub && <p className="text-[7px] text-text-muted mt-0.5 font-bold truncate w-full">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
