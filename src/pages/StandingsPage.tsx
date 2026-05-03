import { Trophy } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { StandingRow } from '@/hooks/useStandings'

function FormDot({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-4 h-4 rounded-sm text-white text-[9px] font-bold',
      result === 'W' && 'bg-green-600',
      result === 'D' && 'bg-slate-600',
      result === 'L' && 'bg-red-600',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}

export function StandingsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)

  const isLoading = seasonLoading || standingsLoading

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header">
          <Trophy size={18} className="text-primary-400" />
          <h1 className="page-title">Classement</h1>
        </div>
        {season && (
          <span className="badge bg-surface-raised text-slate-400 border border-surface-border">
            {season.name}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !standings?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={20} /></div>
            <p className="text-slate-300 font-medium">Classement indisponible</p>
            <p className="text-slate-500 text-sm">Disponible après les premiers matchs.</p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="w-8 px-3 py-2.5 text-left">
                    <span className="section-title">#</span>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <span className="section-title">Club</span>
                  </th>
                  <th className="px-2 py-2.5 text-center w-8">
                    <span className="section-title">MJ</span>
                  </th>
                  <th className="px-2 py-2.5 text-center w-8 hidden sm:table-cell">
                    <span className="section-title text-green-500/80">V</span>
                  </th>
                  <th className="px-2 py-2.5 text-center w-8 hidden sm:table-cell">
                    <span className="section-title">N</span>
                  </th>
                  <th className="px-2 py-2.5 text-center w-8 hidden sm:table-cell">
                    <span className="section-title text-red-500/80">D</span>
                  </th>
                  <th className="px-2 py-2.5 text-center w-10 hidden md:table-cell">
                    <span className="section-title">BP</span>
                  </th>
                  <th className="px-2 py-2.5 text-center w-10 hidden md:table-cell">
                    <span className="section-title">BC</span>
                  </th>
                  <th className="px-2 py-2.5 text-center w-10 hidden md:table-cell">
                    <span className="section-title">+/-</span>
                  </th>
                  <th className="px-3 py-2.5 text-center w-10">
                    <span className="section-title">Pts</span>
                  </th>
                  <th className="px-3 py-2.5 text-center hidden lg:table-cell">
                    <span className="section-title">Forme</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row: StandingRow, i: number) => (
                  <tr
                    key={row.team_id}
                    className={clsx(
                      'border-b border-surface-border/50 hover:bg-surface-raised transition-colors',
                      i === standings.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <span className={clsx(
                        'text-sm font-bold tabular-nums',
                        i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-slate-600'
                      )}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: row.team_color }} />
                        <span className="font-medium text-slate-200 truncate">{row.team_name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-400 tabular-nums">{row.played}</td>
                    <td className="px-2 py-2.5 text-center text-green-400 tabular-nums hidden sm:table-cell">{row.won}</td>
                    <td className="px-2 py-2.5 text-center text-slate-500 tabular-nums hidden sm:table-cell">{row.drawn}</td>
                    <td className="px-2 py-2.5 text-center text-red-400 tabular-nums hidden sm:table-cell">{row.lost}</td>
                    <td className="px-2 py-2.5 text-center text-slate-400 tabular-nums hidden md:table-cell">{row.goals_for}</td>
                    <td className="px-2 py-2.5 text-center text-slate-400 tabular-nums hidden md:table-cell">{row.goals_against}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums hidden md:table-cell">
                      <span className={clsx(
                        'text-xs font-semibold',
                        row.goal_diff > 0 ? 'text-green-400' : row.goal_diff < 0 ? 'text-red-400' : 'text-slate-500'
                      )}>
                        {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={clsx(
                        'text-base font-bold tabular-nums',
                        i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-white'
                      )}>
                        {row.points}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <div className="flex items-center gap-0.5">
                        {row.form.length === 0
                          ? <span className="text-xs text-slate-700">—</span>
                          : row.form.slice(-5).map((r, idx) => <FormDot key={idx} result={r} />)
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
