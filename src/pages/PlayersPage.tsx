import { useState } from 'react'
import { User, Search } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { useTeams } from '@/hooks/useTeams'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { PlayerPosition } from '@/types/database'

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardien',
  defender: 'Défenseur',
  midfielder: 'Milieu',
  forward: 'Attaquant',
}

export function PlayersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: players, isLoading: playersLoading } = usePlayers(season?.id)
  const { data: teams } = useTeams(season?.id)
  const [search, setSearch] = useState('')
  const [filterTeam, setFilterTeam] = useState('')

  const isLoading = seasonLoading || playersLoading

  const filtered = (players ?? []).filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
    const matchSearch = !search || fullName.includes(search.toLowerCase())
    const matchTeam = !filterTeam || p.team_id === filterTeam
    return matchSearch && matchTeam
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Joueurs</h1>
        {season && (
          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30">
            {season.name}
          </span>
        )}
      </div>

      {/* Filters */}
      {!isLoading && !!players?.length && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher un joueur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="input sm:w-48"
          >
            <option value="">Toutes les équipes</option>
            {teams?.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : !season ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune saison active.</p>
        </div>
      ) : !filtered.length ? (
        <div className="card text-center py-12">
          <User size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">
            {players?.length ? 'Aucun joueur ne correspond aux filtres.' : 'Aucun joueur enregistré pour cette saison.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Joueur</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Équipe</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Poste</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((player, i) => {
                  const team = player.teams as unknown as { id: string; name: string; color: string } | null
                  return (
                    <tr
                      key={player.id}
                      className={`border-b border-surface-border/50 hover:bg-surface-border/20 transition-colors ${
                        i === filtered.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-500 font-mono">
                        {player.jersey_number ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center text-slate-300 text-xs font-bold flex-shrink-0">
                            {player.first_name[0]}{player.last_name[0]}
                          </div>
                          <span className="text-white font-medium">
                            {player.first_name} {player.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {team ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: team.color || '#16a34a' }}
                            />
                            <span className="text-slate-300">{team.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400">
                        {player.position ? POSITION_LABELS[player.position] : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
