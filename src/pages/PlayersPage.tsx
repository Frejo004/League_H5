import { useState } from 'react'
import { User, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { useTeams } from '@/hooks/useTeams'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { PlayerPosition, PlayerWithTeam } from '@/types/database'

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
    return (!search || fullName.includes(search.toLowerCase()))
        && (!filterTeam || p.team_id === filterTeam)
  })

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header">
          <User size={18} className="text-primary-400" />
          <h1 className="page-title">Joueurs</h1>
        </div>
        {season && (
          <span className="badge bg-surface-raised text-slate-400 border border-surface-border">
            {season.name}
          </span>
        )}
      </div>

      {/* Filters */}
      {!isLoading && !!players?.length && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8 py-2 text-sm"
            />
          </div>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="input py-2 text-sm w-40"
          >
            <option value="">Toutes les équipes</option>
            {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><User size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !filtered.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><User size={20} /></div>
            <p className="text-slate-400">
              {players?.length ? 'Aucun résultat.' : 'Aucun joueur enregistré.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-2 px-4 py-2 border-b border-surface-border">
            <span className="section-title">#</span>
            <span className="section-title">Joueur</span>
            <span className="section-title hidden sm:block">Équipe</span>
            <span className="section-title hidden md:block">Poste</span>
          </div>

          {filtered.map((player, i) => {
            const p = player as PlayerWithTeam
            const team = p.teams
            return (
              <Link
                key={p.id}
                to={`/players/${p.id}`}
                className={`grid grid-cols-[2.5rem_1fr_auto_auto] gap-2 items-center px-4 py-2.5
                            hover:bg-surface-raised transition-colors
                            ${i < filtered.length - 1 ? 'border-b border-surface-border/50' : ''}`}
              >
                <span className="text-sm text-slate-600 font-mono text-center">
                  {p.jersey_number ?? '—'}
                </span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-surface-raised flex items-center justify-center
                                  text-slate-300 text-xs font-bold shrink-0">
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <span className="text-sm text-slate-200 font-medium truncate">
                    {p.first_name} {p.last_name}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  {team && (
                    <>
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: team.color }} />
                      <span className="text-xs text-slate-400 truncate max-w-[80px]">{team.name}</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-slate-500 hidden md:block">
                  {p.position ? POSITION_LABELS[p.position] : '—'}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
