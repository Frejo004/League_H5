import { Trophy } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { StandingRow } from '@/hooks/useStandings'

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold',
      result === 'W' && 'bg-green-500',
      result === 'D' && 'bg-slate-500',
      result === 'L' && 'bg-red-500',
    )}>
      {result === 'W' ? '✓' : result === 'L' ? '✕' : '—'}
    </span>
  )
}

function RankIndicator({ rank }: { rank: number }) {
  // Top 3 get a colored left border accent
  const color =
    rank === 1 ? 'bg-yellow-400' :
    rank === 2 ? 'bg-slate-300' :
    rank === 3 ? 'bg-amber-500' :
    'bg-transparent'
  return <span className={clsx('absolute left-0 top-1 bottom-1 w-0.5 rounded-r', color)} />
}

export function StandingsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)

  const isLoading = seasonLoading || standingsLoading

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Classement</h1>
        {season && (
          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30">
            {season.name}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : !season ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune saison active.</p>
        </div>
      ) : !standings?.length ? (
        <div className="card text-center py-12">
          <Trophy size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">Le classement sera disponible une fois les matchs joués.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Column headers */}
              <thead>
                <tr className="border-b border-surface-border/60">
                  <th className="w-10 px-3 py-3 text-left text-xs text-slate-500 font-medium">#</th>
                  <th className="px-3 py-3 text-left text-xs text-slate-500 font-medium">Club</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-500 font-medium">MP</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium hidden sm:table-cell">W</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium hidden sm:table-cell">D</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium hidden sm:table-cell">L</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium hidden md:table-cell">GF</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium hidden md:table-cell">GA</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-400 font-medium hidden md:table-cell">GD</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-200 font-bold">Pts</th>
                  <th className="px-3 py-3 text-center text-xs text-slate-500 font-medium hidden lg:table-cell">Last 5</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-border/30">
                {standings.map((row: StandingRow, i: number) => (
                  <tr
                    key={row.team_id}
                    className="relative hover:bg-white/4 transition-colors duration-150 group"
                  >
                    {/* Rank accent bar */}
                    <td className="relative w-10 px-3 py-3.5">
                      <RankIndicator rank={i + 1} />
                      <span className={clsx(
                        'font-bold text-sm',
                        i === 0 && 'text-yellow-400',
                        i === 1 && 'text-slate-300',
                        i === 2 && 'text-amber-500',
                        i > 2 && 'text-slate-500',
                      )}>
                        {i + 1}
                      </span>
                    </td>

                    {/* Club name + color dot */}
                    <td className="px-3 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10"
                          style={{ backgroundColor: row.team_color || '#16a34a' }}
                        />
                        <span className="text-white font-medium truncate">{row.team_name}</span>
                      </div>
                    </td>

                    {/* MP */}
                    <td className="px-3 py-3.5 text-center text-slate-300 tabular-nums">{row.played}</td>

                    {/* W */}
                    <td className="px-3 py-3.5 text-center text-green-400 tabular-nums hidden sm:table-cell">{row.won}</td>

                    {/* D */}
                    <td className="px-3 py-3.5 text-center text-slate-400 tabular-nums hidden sm:table-cell">{row.drawn}</td>

                    {/* L */}
                    <td className="px-3 py-3.5 text-center text-red-400 tabular-nums hidden sm:table-cell">{row.lost}</td>

                    {/* GF */}
                    <td className="px-3 py-3.5 text-center text-slate-300 tabular-nums hidden md:table-cell">{row.goals_for}</td>

                    {/* GA */}
                    <td className="px-3 py-3.5 text-center text-slate-300 tabular-nums hidden md:table-cell">{row.goals_against}</td>

                    {/* GD */}
                    <td className="px-3 py-3.5 text-center tabular-nums hidden md:table-cell">
                      <span className={clsx(
                        'font-medium',
                        row.goal_diff > 0 && 'text-green-400',
                        row.goal_diff < 0 && 'text-red-400',
                        row.goal_diff === 0 && 'text-slate-500',
                      )}>
                        {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                      </span>
                    </td>

                    {/* Pts — bold, prominent */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="text-white font-black text-base tabular-nums">{row.points}</span>
                    </td>

                    {/* Last 5 form */}
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {row.form.length === 0 ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : (
                          row.form.map((r, idx) => <FormBadge key={idx} result={r} />)
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-surface-border/40 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-xs text-slate-500">1er</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[8px] font-bold">✓</span>
                <span className="text-xs text-slate-500">Victoire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-500 text-white text-[8px] font-bold">—</span>
                <span className="text-xs text-slate-500">Nul</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold">✕</span>
                <span className="text-xs text-slate-500">Défaite</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
