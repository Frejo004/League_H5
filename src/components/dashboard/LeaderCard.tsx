import { Trophy } from 'lucide-react'
import { useStandings } from '@/hooks/useStandings'

// ── Leader card ───────────────────────────────────────────────────────────────
export function LeaderCard({ team }: { team: NonNullable<ReturnType<typeof useStandings>['data']>[0] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 bg-surface-card border-surface-border shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${team.team_color}10 0%, transparent 70%)` }} />
      <div className="flex items-center gap-1 mb-3">
        <Trophy size={11} className="text-yellow-500 dark:text-yellow-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Leader</span>
      </div>
      <div className="flex items-center gap-3 relative">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg shrink-0"
          style={{ backgroundColor: team.team_color }}>
          {team.team_logo ? <img src={team.team_logo} alt="" className="w-9 h-9 object-contain rounded-lg" /> : team.team_name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate leading-tight text-text-primary">{team.team_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">{team.won}V</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">{team.drawn}N</span>
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{team.lost}D</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black tabular-nums leading-none" style={{ color: team.team_color }}>{team.points}</p>
          <p className="text-[10px] mt-0.5 text-text-muted">pts</p>
        </div>
      </div>
    </div>
  )
}
