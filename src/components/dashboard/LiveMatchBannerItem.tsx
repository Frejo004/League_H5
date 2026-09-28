import { Link } from 'react-router-dom'
import { useLiveClock } from '@/hooks/useMatchLive'
import type { MatchWithTeams } from '@/hooks/useMatches'

// ── Live match banner ─────────────────────────────────────────────────────────
export function LiveMatchBannerItem({ match }: { match: MatchWithTeams }) {
  const clock = useLiveClock(
    match.live_started_at, match.live_period as 1 | 2, match.status,
    match.halftime_at, match.is_paused ?? false, match.paused_at ?? null, match.total_paused_seconds ?? 0
  )
  return (
    <Link to={`/matches/${match.slug || match.id}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised/50 hover:bg-surface-raised border border-red-500/20 transition-all group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg"
          style={{ backgroundColor: match.home_team.color }}>
          {match.home_team.logo_url ? <img src={match.home_team.logo_url} alt="" className="w-6 h-6 object-contain rounded-md" /> : match.home_team.name[0]}
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">{match.home_team.name}</span>
      </div>
      <div className="flex flex-col items-center gap-1 px-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-text-primary tabular-nums drop-shadow-md">{match.home_score ?? 0}</span>
          <span className="text-text-muted font-bold">–</span>
          <span className="text-2xl font-black text-text-primary tabular-nums drop-shadow-md">{match.away_score ?? 0}</span>
        </div>
        <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse border border-red-400/20">
          {clock.label}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-sm font-semibold text-text-primary truncate text-right">{match.away_team.name}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg"
          style={{ backgroundColor: match.away_team.color }}>
          {match.away_team.logo_url ? <img src={match.away_team.logo_url} alt="" className="w-6 h-6 object-contain rounded-md" /> : match.away_team.name[0]}
        </div>
      </div>
    </Link>
  )
}
