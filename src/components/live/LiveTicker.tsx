import { Link } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches } from '@/hooks/useMatches'
import { useRealtimeMatches } from '@/hooks/useRealtime'
import { useLiveClock } from '@/hooks/useMatchLive'
import { LiveBadge } from './LiveBadge'
import clsx from 'clsx'

function TickerItem({ match }: { match: any }) {
  const clock = useLiveClock(
    match.live_started_at,
    match.live_period,
    match.status,
    match.halftime_at
  )

  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-3 px-4 py-1.5 h-full bg-red-500/5 hover:bg-red-500/10 border-x border-red-500/10 transition-all shrink-0"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-white truncate max-w-[80px] uppercase">
          {match.home_team.name}
        </span>
        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded border border-white/5">
          <span className="text-xs font-black text-white tabular-nums">{match.home_score ?? 0}</span>
          <span className="text-[10px] text-slate-600">-</span>
          <span className="text-xs font-black text-white tabular-nums">{match.away_score ?? 0}</span>
        </div>
        <span className="text-[10px] font-black text-white truncate max-w-[80px] uppercase">
          {match.away_team.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 ml-1">
        <span className="text-[9px] font-black text-red-400 tabular-nums animate-pulse">
          {clock.label}
        </span>
      </div>
    </Link>
  )
}

export function GlobalLiveTicker() {
  const { data: season } = useActiveSeason()
  const { data: matches } = useMatches(season?.id)
  
  useRealtimeMatches(season?.id)

  const liveMatches = (matches ?? []).filter(m => m.status === 'live')

  if (liveMatches.length === 0) return null

  return (
    <div className="flex items-center w-full overflow-hidden border-b border-red-500/20"
         style={{ 
           height: 34, 
           background: 'linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(15,20,32,1) 50%, rgba(239,68,68,0.12) 100%)' 
         }}>
      <div className="flex items-center px-4 h-full bg-red-600 shrink-0">
        <Radio size={12} className="text-white animate-pulse mr-1.5" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE</span>
      </div>
      
      <div className="flex items-center flex-1 overflow-x-auto scrollbar-none h-full">
        {liveMatches.map(match => (
          <TickerItem key={match.id} match={match} />
        ))}
      </div>

      <div className="hidden lg:flex items-center px-4 h-full shrink-0">
         <LiveBadge size="sm" className="scale-75 origin-right" />
      </div>
    </div>
  )
}
