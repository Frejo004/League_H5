import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useLiveStandings } from '@/hooks/useLiveStandings'

interface LiveTableWidgetProps {
  seasonId?: string
  matchId: string
  homeId: string
  awayId: string
  homeScore: number
  awayScore: number
  status: string
  className?: string
}

export function LiveTableWidget({
  seasonId, matchId, homeId, awayId, homeScore, awayScore, status, className
}: LiveTableWidgetProps) {
  const { data: standings, isLoading } = useLiveStandings(
    seasonId, matchId, homeId, awayId, homeScore, awayScore, status
  )

  if (isLoading || !standings.length) return null

  // On n'affiche que le top 5 + les équipes du match si elles sont plus bas
  const homePos = standings.findIndex(s => s.team_id === homeId)
  const awayPos = standings.findIndex(s => s.team_id === awayId)
  
  const displayRows = standings.filter((s, idx) => {
    return idx < 5 || idx === homePos || idx === awayPos
  })

  return (
    <div className={clsx('card p-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Classement en direct
        </h3>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Saison en cours</span>
      </div>

      <div className="p-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="py-2 pl-3 text-left w-8">#</th>
              <th className="py-2 text-left">Équipe</th>
              <th className="py-2 text-center w-8">MJ</th>
              <th className="py-2 text-center w-8">DB</th>
              <th className="py-2 pr-3 text-right w-10">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {displayRows.map((row, idx) => {
              const pos = standings.indexOf(row) + 1
              const isMatchTeam = row.team_id === homeId || row.team_id === awayId
              
              return (
                <tr 
                  key={row.team_id}
                  className={clsx(
                    'transition-colors duration-500',
                    isMatchTeam ? 'bg-primary-500/10' : 'hover:bg-white/[0.02]'
                  )}
                >
                  <td className="py-2.5 pl-3 text-xs font-black tabular-nums text-slate-500">
                    {pos}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-1 ring-white/10"
                          style={{ backgroundColor: row.team_color }}>
                          {row.team_logo ? (
                            <img src={row.team_logo} className="w-4 h-4 object-contain" />
                          ) : row.team_name[0]}
                        </div>
                        {/* Indicateur de changement */}
                        {row.position_change !== 0 && (
                          <div className={clsx(
                            'absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-surface-card flex items-center justify-center text-[8px] font-bold shadow-lg',
                            row.position_change! > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          )}>
                            {row.position_change! > 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                          </div>
                        )}
                      </div>
                      <span className={clsx(
                        'text-xs uppercase tracking-wide truncate max-w-[120px]',
                        isMatchTeam ? 'font-black text-white' : 'font-bold text-slate-300'
                      )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {row.team_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-center text-[11px] font-bold text-slate-500 tabular-nums">
                    {row.played}
                  </td>
                  <td className="py-2.5 text-center text-[11px] font-bold text-slate-500 tabular-nums">
                    {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                  </td>
                  <td className={clsx(
                    'py-2.5 pr-3 text-right text-sm font-black tabular-nums',
                    isMatchTeam ? 'text-primary-400' : 'text-slate-300'
                  )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {row.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {standings.length > displayRows.length && (
        <div className="px-4 py-2 bg-black/20 text-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.1em]">
            ...
          </p>
        </div>
      )}
    </div>
  )
}
