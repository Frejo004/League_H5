import { Trophy } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

export function StandingsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)

  const isLoading = seasonLoading || standingsLoading

  return (
    <div className="space-y-6">
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
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-8">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Équipe</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium">MJ</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium hidden sm:table-cell">V</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium hidden sm:table-cell">N</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium hidden sm:table-cell">D</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium hidden md:table-cell">BP</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium hidden md:table-cell">BC</th>
                  <th className="text-center px-3 py-3 text-slate-400 font-medium hidden md:table-cell">Diff</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr
                    key={row.team_id}
                    className={clsx(
                      'border-b border-surface-border/50 hover:bg-surface-border/20 transition-colors',
                      i === standings.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'text-sm font-bold',
                        i === 0 && 'text-yellow-400',
                        i === 1 && 'text-slate-300',
                        i === 2 && 'text-amber-600',
                        i > 2 && 'text-slate-500'
                      )}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.team_color || '#16a34a' }}
                        />
                        <span className="text-white font-medium">{row.team_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-300">{row.played}</td>
                    <td className="px-3 py-3 text-center text-green-400 hidden sm:table-cell">{row.won}</td>
                    <td className="px-3 py-3 text-center text-slate-400 hidden sm:table-cell">{row.drawn}</td>
                    <td className="px-3 py-3 text-center text-red-400 hidden sm:table-cell">{row.lost}</td>
                    <td className="px-3 py-3 text-center text-slate-300 hidden md:table-cell">{row.goals_for}</td>
                    <td className="px-3 py-3 text-center text-slate-300 hidden md:table-cell">{row.goals_against}</td>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      <span className={clsx(
                        row.goal_diff > 0 && 'text-green-400',
                        row.goal_diff < 0 && 'text-red-400',
                        row.goal_diff === 0 && 'text-slate-400'
                      )}>
                        {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-bold text-base">{row.points}</span>
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
