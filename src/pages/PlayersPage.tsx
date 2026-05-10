import { useState, useEffect } from 'react'
import { User, Search, ChevronDown, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { useTeams } from '@/hooks/useTeams'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonRow, SkeletonLine } from '@/components/ui/SkeletonLoader'
import { clsx } from 'clsx'
import type { PlayerPosition, PlayerWithTeam, TeamWithCaptain } from '@/types/database'

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardien',
  defender:   'Défenseur',
  midfielder: 'Milieu',
  forward:    'Attaquant',
}

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: 'text-yellow-400 bg-yellow-400/10',
  defender:   'text-blue-400 bg-blue-400/10',
  midfielder: 'text-green-400 bg-green-400/10',
  forward:    'text-orange-400 bg-orange-400/10',
}

type SortKey = 'name' | 'jersey' | 'position'
const PAGE_SIZE = 20

export function PlayersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: players, isLoading: playersLoading } = usePlayers(season?.id)
  const { data: teams } = useTeams(season?.id)

  const [search,     setSearch]     = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterPos,  setFilterPos]  = useState<PlayerPosition | ''>('')
  const [sortKey,    setSortKey]    = useState<SortKey>('name')
  const [page,       setPage]       = useState(1)

  // Reset page quand les filtres changent
  useEffect(() => { setPage(1) }, [search, filterTeam, filterPos, sortKey])

  const isLoading = seasonLoading || playersLoading

  const filtered = (players ?? [])
    .filter(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
      return (!search     || fullName.includes(search.toLowerCase()))
          && (!filterTeam || p.team_id === filterTeam)
          && (!filterPos  || p.position === filterPos)
    })
    .sort((a, b) => {
      if (sortKey === 'jersey') return (a.jersey_number ?? 99) - (b.jersey_number ?? 99)
      if (sortKey === 'position') return (a.position ?? 'z').localeCompare(b.position ?? 'z')
      return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)
    })

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = paginated.length < filtered.length
  const hasFilters = !!search || !!filterTeam || !!filterPos

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
          { label: 'Joueurs',  value: players.length },
          { label: 'Équipes',  value: teams?.length ?? 0 },
          { label: 'Gardiens', value: players.filter(p => p.position === 'goalkeeper').length },
          { label: 'Attaquants', value: players.filter(p => p.position === 'forward').length },
        ] : undefined}
        compact
      />

      {/* Filters */}
      {!isLoading && !!players?.length && (
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un joueur…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input input-icon-l py-2 text-sm"
            />
          </div>

          {/* Team filter */}
          <div className="relative">
            <select
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
              className="input py-2 text-sm pr-8 appearance-none cursor-pointer"
              style={{ minWidth: 140 }}
            >
              <option value="">Toutes les équipes</option>
              {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* Position filter */}
          <div className="relative">
            <select
              value={filterPos}
              onChange={e => setFilterPos(e.target.value as PlayerPosition | '')}
              className="input py-2 text-sm pr-8 appearance-none cursor-pointer"
              style={{ minWidth: 130 }}
            >
              <option value="">Tous les postes</option>
              {(Object.entries(POSITION_LABELS) as [PlayerPosition, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="input py-2 text-sm pr-8 appearance-none cursor-pointer"
              style={{ minWidth: 120 }}
            >
              <option value="name">Trier : Nom</option>
              <option value="jersey">Trier : N°</option>
              <option value="position">Trier : Poste</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* Reset */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterTeam(''); setFilterPos('') }}
              className="btn-secondary py-2 text-xs"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Compteur */}
      {!isLoading && hasFilters && (
        <p className="text-xs text-slate-500 animate-fade-in">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          {search && <> pour « <span className="text-slate-300">{search}</span> »</>}
        </p>
      )}

      {isLoading ? (
        <div className="card p-0 overflow-hidden animate-fade-in">
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-2 px-4 py-2 border-b border-surface-border">
            {['w-4', 'w-1/3', 'w-20', 'w-16'].map((w, i) => (
              <SkeletonLine key={i} width={w} height="h-2" />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
        </div>
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
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterTeam(''); setFilterPos('') }}
                className="btn-secondary text-xs mt-2"
              >
                Effacer les filtres
              </button>
            )}
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

          <div className="stagger-fast">
            {paginated.map((player, i) => {
              const p = player as PlayerWithTeam
              const team = p.teams
              const teamWithCaptain = teams?.find(t => t.id === p.team_id) as TeamWithCaptain | undefined
              const isCaptain = teamWithCaptain?.captain_player_id === p.id
              
              return (
                <Link
                  key={p.id}
                  to={`/players/${p.id}`}
                  className={clsx(
                    'grid grid-cols-[2.5rem_1fr_auto_auto] gap-2 items-center px-4 py-2.5',
                    'hover:bg-surface-raised transition-colors',
                    i < filtered.length - 1 && 'border-b border-surface-border/50'
                  )}
                >
                  <span className="text-sm text-slate-600 font-mono text-center">
                    {p.jersey_number ?? '—'}
                  </span>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden relative"
                      style={{ backgroundColor: team?.color ?? '#16a34a' }}
                    >
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        : `${p.first_name[0]}${p.last_name[0]}`
                      }
                      {isCaptain && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center border border-surface-card">
                          <Crown size={8} className="text-slate-900" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm text-slate-200 font-medium truncate">
                        {p.first_name} {p.last_name}
                      </span>
                      {isCaptain && (
                        <span className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[9px] px-1.5 py-0.5 shrink-0">
                          Capitaine
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5">
                    {team && (
                      <>
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: team.color }} />
                        <span className="text-xs text-slate-400 truncate max-w-[80px]">{team.name}</span>
                      </>
                    )}
                  </div>

                  <div className="hidden md:block">
                    {p.position ? (
                      <span className={clsx(
                        'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                        POSITION_COLORS[p.position]
                      )}>
                        {POSITION_LABELS[p.position]}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Bouton charger plus */}
          {hasMore && (
            <div className="flex items-center justify-center py-4 border-t border-surface-border/50">
              <button
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                Charger plus
                <span className="text-slate-600 text-xs">
                  ({filtered.length - paginated.length} restants)
                </span>
              </button>
            </div>
          )}

          {/* Compteur total */}
          <div className="px-4 py-2 border-t border-surface-border/30 text-center">
            <p className="text-[10px] text-slate-700">
              {paginated.length} / {filtered.length} joueur{filtered.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
