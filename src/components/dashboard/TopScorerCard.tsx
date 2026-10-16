import { Target, Flame } from 'lucide-react'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import { useScorers } from '@/hooks/useScorers'

// ── Top scorer card ───────────────────────────────────────────────────────────
export function TopScorerCard({ scorer }: { scorer: NonNullable<ReturnType<typeof useScorers>['data']>[0] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 bg-surface-card border-surface-border shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      {/* Glow / gradient background */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-70 opacity-40"
        style={{ background: `radial-gradient(ellipse 80% 80% at 100% 0%, ${scorer.team_color}20 0%, transparent 70%)` }} />
      
      {/* Filigrane Icône */}
      <Target className="absolute -right-6 -bottom-6 w-32 h-32 text-orange-500/5 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />

      <div className="flex items-center gap-1 mb-3">
        <Flame size={11} className="text-orange-500 dark:text-orange-400 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Meilleur buteur</span>
      </div>
      <div className="flex items-center gap-3 relative">
        <div className="relative shrink-0">
          <PlayerAvatar firstName={scorer.first_name} lastName={scorer.last_name}
            avatarUrl={scorer.avatar_url} teamColor={scorer.team_color} size={44} shape="lg" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center border-2 border-surface-card">
            <Target size={9} className="text-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate leading-tight text-text-primary">{scorer.first_name} {scorer.last_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: scorer.team_color }} />
            <span className="text-xs truncate text-text-muted">{scorer.team_name}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black text-orange-500 dark:text-orange-400 tabular-nums leading-none">{scorer.goals}</p>
          <p className="text-[10px] mt-0.5 text-text-muted">buts</p>
        </div>
      </div>
    </div>
  )
}
