import { useState } from 'react'
import { User, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { useTeams } from '@/hooks/useTeams'
import { PageHero } from '@/components/ui/PageHero'
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

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1200&q=80&auto=format&fit=crop"
        pattern="dots"
        accentColor="#06b6d4"
        title="Joueurs"
        subtitle={season?.name}
        icon={<User size={20} className="text-cyan-400" />}
        stats={players?.length ? [
          { label: 'Joueurs',    value: players.length },
          { label: 'Équipes',    value: teams?.length ?? 0 },
        ] : undefined}
        compact
      />

      {/* Filters */}
      {!isLoading && !!players?.length && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input input-icon-l py-2 text-sm"
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
                  <div className="w-7 h-7 rounded-full flex items-center justify-center
                                  text-white text-xs font-bold shrink-0 overflow-hidden"
                    style={{ backgroundColor: team?.color ?? '#16a34a' }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      : `${p.first_name[0]}${p.last_name[0]}`
                    }
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
