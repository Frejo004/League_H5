import { Target } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useScorers } from '@/hooks/useScorers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

export function ScorersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: scorers, isLoading: scorersLoading } = useScorers(season?.id)

  const isLoading = seasonLoading || scorersLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Buteurs & Passeurs</h1>
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
      ) : !scorers?.length ? (
        <div className="card text-center py-12">
          <Target size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">Aucune statistique disponible pour le moment.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-8">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Joueur</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Équipe</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">⚽ Buts</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">🎯 Passes</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium hidden md:table-cell">CSC</th>
                </tr>
              </thead>
              <tbody>
                {scorers.map((row, i) => (
                  <tr
                    key={row.player_id}
                    className={clsx(
                      'border-b border-surface-border/50 hover:bg-surface-border/20 transition-colors',
                      i === scorers.length - 1 && 'border-b-0'
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
                        <div className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center text-slate-300 text-xs font-bold flex-shrink-0">
                          {row.first_name[0]}{row.last_name[0]}
                        </div>
                        <span className="text-white font-medium">
                          {row.first_name} {row.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.team_color || '#16a34a' }}
                        />
                        <span className="text-slate-300">{row.team_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-bold text-base">{row.goals}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell text-slate-300">
                      {row.assists}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell text-slate-500">
                      {row.own_goals || '—'}
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
