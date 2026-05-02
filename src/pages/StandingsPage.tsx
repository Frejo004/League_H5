import { Trophy } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { StandingRow } from '@/hooks/useStandings'

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded-md text-white text-[9px] font-black',
      result === 'W' && 'bg-green-500/80',
      result === 'D' && 'bg-slate-600',
      result === 'L' && 'bg-red-500/80',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-sm font-black rank-gold text-glow-gold">1</span>
  if (rank === 2) return <span className="text-sm font-black rank-silver">2</span>
  if (rank === 3) return <span className="text-sm font-black rank-bronze">3</span>
  return <span className="text-sm font-bold text-slate-600">{rank}</span>
}

export function StandingsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)

  const isLoading = seasonLoading || standingsLoading

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="page-header">
          <Trophy className="text-primary-400" size={22} />
          <h1 className="page-title">Classement</h1>
          {season && (
            <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30">
              {season.name}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={22} /></div>
            <p className="text-slate-400 font-medium">Aucune saison active</p>
          </div>
        </div>
      ) : !standings?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={22} /></div>
            <p className="text-slate-300 font-semibold">Classement indisponible</p>
            <p className="text-slate-500 text-sm">Disponible une fois les premiers matchs joués.</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Podium top 3 (desktop) ── */}
          {standings.length >= 3 && (
            <div className="hidden md:grid grid-cols-3 gap-3 animate-fade-in-up">
              {[standings[1], standings[0], standings[2]].map((row, podiumIdx) => {
                const realRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
                const isFirst = realRank === 1
                return (
                  <div
                    key={row.team_id}
                    className={clsx(
                      'relative rounded-2xl p-4 text-center border transition-all',
                      isFirst
                        ? 'bg-linear-to-b from-yellow-500/10 to-surface-card border-yellow-500/25 shadow-[0_0_30px_rgba(251,191,36,0.08)] -mt-2'
                        : 'bg-surface-card border-surface-border'
                    )}
                  >
                    {isFirst && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</div>
                    )}
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <div
                        className="w-10 h-10 rounded-xl ring-2 ring-white/10"
                        style={{ backgroundColor: row.team_color }}
                      />
                      <p className="text-white font-bold text-sm truncate w-full">{row.team_name}</p>
                      <div className={clsx(
                        'text-3xl font-black',
                        realRank === 1 ? 'rank-gold text-glow-gold' :
                        realRank === 2 ? 'rank-silver' : 'rank-bronze'
                      )}>
                        {row.points}
                        <span className="text-xs font-semibold ml-1 opacity-60">pts</span>
                      </div>
                      <div className="flex gap-1 text-xs text-slate-500">
                        <span className="text-green-400 font-bold">{row.won}V</span>
                        <span>·</span>
                        <span>{row.drawn}N</span>
                        <span>·</span>
                        <span className="text-red-400">{row.lost}D</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Full table ── */}
          <div className="card overflow-hidden p-0 animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border/60">
                    <th className="w-10 px-3 py-3 text-left">
                      <span className="section-title">#</span>
                    </th>
                    <th className="px-3 py-3 text-left">
                      <span className="section-title">Club</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="section-title">MJ</span>
                    </th>
                    <th className="px-3 py-3 text-center hidden sm:table-cell">
                      <span className="section-title text-green-500/70">V</span>
                    </th>
                    <th className="px-3 py-3 text-center hidden sm:table-cell">
                      <span className="section-title">N</span>
                    </th>
                    <th className="px-3 py-3 text-center hidden sm:table-cell">
                      <span className="section-title text-red-500/70">D</span>
                    </th>
                    <th className="px-3 py-3 text-center hidden md:table-cell">
                      <span className="section-title">BP</span>
                    </th>
                    <th className="px-3 py-3 text-center hidden md:table-cell">
                      <span className="section-title">BC</span>
                    </th>
                    <th className="px-3 py-3 text-center hidden md:table-cell">
                      <span className="section-title">+/-</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="section-title text-white/60">Pts</span>
                    </th>
                    <th className="px-3 py-3 text-center hidden lg:table-cell">
                      <span className="section-title">Forme</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-surface-border/20">
                  {standings.map((row: StandingRow, i: number) => {
                    const isTop3 = i < 3
                    return (
                      <tr
                        key={row.team_id}
                        className={clsx(
                          'relative transition-colors duration-150 group',
                          i === 0 && 'bg-yellow-500/3',
                          i > 0 && 'hover:bg-white/3'
                        )}
                      >
                        {/* Left accent bar for top 3 */}
                        <td className="relative w-10 px-3 py-3.5">
                          {isTop3 && (
                            <span className={clsx(
                              'absolute left-0 top-2 bottom-2 w-0.5 rounded-r',
                              i === 0 && 'bg-yellow-400',
                              i === 1 && 'bg-slate-400',
                              i === 2 && 'bg-amber-500',
                            )} />
                          )}
                          <RankBadge rank={i + 1} />
                        </td>

                        {/* Club */}
                        <td className="px-3 py-3.5 min-w-[140px]">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-white/10"
                              style={{ backgroundColor: row.team_color || '#16a34a' }}
                            />
                            <span className={clsx(
                              'font-semibold truncate',
                              i === 0 ? 'text-white' : 'text-slate-200'
                            )}>
                              {row.team_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-center text-slate-400 tabular-nums">{row.played}</td>
                        <td className="px-3 py-3.5 text-center text-green-400 tabular-nums font-medium hidden sm:table-cell">{row.won}</td>
                        <td className="px-3 py-3.5 text-center text-slate-500 tabular-nums hidden sm:table-cell">{row.drawn}</td>
                        <td className="px-3 py-3.5 text-center text-red-400 tabular-nums hidden sm:table-cell">{row.lost}</td>
                        <td className="px-3 py-3.5 text-center text-slate-400 tabular-nums hidden md:table-cell">{row.goals_for}</td>
                        <td className="px-3 py-3.5 text-center text-slate-400 tabular-nums hidden md:table-cell">{row.goals_against}</td>
                        <td className="px-3 py-3.5 text-center tabular-nums hidden md:table-cell">
                          <span className={clsx(
                            'font-semibold text-xs px-1.5 py-0.5 rounded',
                            row.goal_diff > 0 && 'text-green-400 bg-green-500/10',
                            row.goal_diff < 0 && 'text-red-400 bg-red-500/10',
                            row.goal_diff === 0 && 'text-slate-500',
                          )}>
                            {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                          </span>
                        </td>

                        {/* Points — most prominent */}
                        <td className="px-3 py-3.5 text-center">
                          <span className={clsx(
                            'font-black text-lg tabular-nums',
                            i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-white'
                          )}>
                            {row.points}
                          </span>
                        </td>

                        {/* Form */}
                        <td className="px-3 py-3.5 hidden lg:table-cell">
                          <div className="flex items-center justify-center gap-0.5">
                            {row.form.length === 0 ? (
                              <span className="text-xs text-slate-700">—</span>
                            ) : (
                              row.form.map((r, idx) => <FormBadge key={idx} result={r} />)
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-surface-border/30 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-green-500/80 text-white text-[8px] font-black">V</span>
                  <span className="text-xs text-slate-600">Victoire</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-slate-600 text-white text-[8px] font-black">N</span>
                  <span className="text-xs text-slate-600">Nul</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-red-500/80 text-white text-[8px] font-black">D</span>
                  <span className="text-xs text-slate-600">Défaite</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
