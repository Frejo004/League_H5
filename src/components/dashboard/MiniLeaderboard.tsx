import { Link } from 'react-router-dom'
import { BarChart2, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import { useLeaderboard } from '@/hooks/usePolls'

// ── Mini leaderboard pronostics ───────────────────────────────────────────
export function MiniLeaderboard({ seasonId }: { seasonId: string }) {
  const { data: lb, isLoading } = useLeaderboard(seasonId)
  if (isLoading || !lb?.length) return null
  const top5 = lb.slice(0, 5)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={12} className="text-primary-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Top Pronostiqueurs</span>
        </div>
        <Link to="/polls?tab=leaderboard" className="text-[10px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors">
          Tout voir <ChevronRight size={10} />
        </Link>
      </div>
      <div className="space-y-2">
        {top5.map((entry, i) => (
          <div key={entry.user_id} className="flex items-center gap-2.5">
            <span className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
              i === 0 ? 'bg-yellow-400/20 text-yellow-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-amber-600/20 text-amber-600' : 'bg-surface-raised text-text-muted'
            )}>
              {i + 1}
            </span>
            <PlayerAvatar
              firstName={entry.full_name?.split(' ')[0] ?? '?'}
              lastName={entry.full_name?.split(' ').slice(1).join(' ') ?? ''}
              avatarUrl={entry.avatar_url}
              size={24}
            />
            <span className="text-xs font-semibold text-text-primary truncate flex-1">
              {entry.full_name ?? 'Anonyme'}
            </span>
            <span className="text-xs font-black text-primary-400 tabular-nums shrink-0">
              {entry.total_points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
