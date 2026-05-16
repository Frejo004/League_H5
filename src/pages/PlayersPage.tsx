import { useState, useEffect } from 'react'
import { User, Search, ChevronDown, Crown, GitCompare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { useTeams } from '@/hooks/useTeams'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { usePlayerDiscipline } from '@/hooks/useDisciplinaryStats'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonRow, SkeletonLine } from '@/components/ui/SkeletonLoader'
import { clsx } from 'clsx'
import type { PlayerPosition, PlayerWithTeam, TeamWithCaptain } from '@/types/database'

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardien',
  defender: 'Défenseur',
  midfielder: 'Milieu',
  forward: 'Attaquant',
}

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: 'text-yellow-400 bg-yellow-400/10',
  defender: 'text-blue-400 bg-blue-400/10',
  midfielder: 'text-green-400 bg-green-400/10',
  forward: 'text-orange-400 bg-orange-400/10',
}

type SortKey = 'name' | 'jersey' | 'position'
const PAGE_SIZE = 20

// ─────────────────────────────────────────────────────────────────────────────
// CompareModal — comparaison côte à côte de 2 joueurs
// ─────────────────────────────────────────────────────────────────────────────

const POSITION_LABELS_COMPARE: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardien',
  defender: 'Défenseur',
  midfielder: 'Milieu',
  forward: 'Attaquant',
}

function CompareModal({ playerAId, playerBId, seasonId, onClose }: {
  playerAId: string
  playerBId: string
  seasonId: string
  onClose: () => void
}) {
  const { data: a, isLoading: la } = usePlayerProfile(playerAId)
  const { data: b, isLoading: lb } = usePlayerProfile(playerBId)
  const { data: mvpA } = usePlayerMvp(playerAId, seasonId)
  const { data: mvpB } = usePlayerMvp(playerBId, seasonId)
  const { data: discA } = usePlayerDiscipline(playerAId, seasonId)
  const { data: discB } = usePlayerDiscipline(playerBId, seasonId)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Bloquer le scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isLoading = la || lb

  const stats = [
    { label: 'Matchs joués',    a: a?.matches_played ?? 0,   b: b?.matches_played ?? 0,   icon: '📅' },
    { label: 'Buts',            a: a?.goals ?? 0,             b: b?.goals ?? 0,             icon: '⚽' },
    { label: 'Passes déc.',     a: a?.assists ?? 0,           b: b?.assists ?? 0,           icon: '🅰️' },
    { label: 'Buts CSC',        a: a?.own_goals ?? 0,         b: b?.own_goals ?? 0,         icon: '🔴', lowerIsBetter: true },
    { label: 'Homme du match',  a: mvpA?.total_mvp ?? 0,      b: mvpB?.total_mvp ?? 0,      icon: '⭐' },
    { label: 'Cartons jaunes',  a: discA?.yellow_cards ?? 0,  b: discB?.yellow_cards ?? 0,  icon: '🟨', lowerIsBetter: true },
    { label: 'Cartons rouges',  a: discA?.red_cards ?? 0,     b: discB?.red_cards ?? 0,     icon: '🟥', lowerIsBetter: true },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl bg-surface border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-primary-400" />
            <span className="text-sm font-black text-white uppercase tracking-widest">Comparaison</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : a && b ? (
            <div className="p-5 space-y-5">
              {/* Noms des joueurs */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <PlayerHeader player={a} />
                <span className="text-slate-600 font-black text-sm">VS</span>
                <PlayerHeader player={b} side="right" />
              </div>

              {/* Positions */}
              <div className="grid grid-cols-2 gap-2">
                {[a, b].map((p, idx) => (
                  <div
                    key={idx}
                    className="text-center py-1.5 px-2 rounded-lg bg-white/4 border border-white/6"
                  >
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {p.position
                        ? POSITION_LABELS_COMPARE[p.position as PlayerPosition] ?? p.position
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="space-y-3">
                {stats.map(({ label, a: va, b: vb, icon, lowerIsBetter }) => {
                  const aWins = lowerIsBetter ? va < vb : va > vb
                  const bWins = lowerIsBetter ? vb < va : vb > va
                  const tied = va === vb
                  const maxVal = Math.max(va, vb, 1)
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={clsx(
                          'text-base font-black tabular-nums w-6 text-left',
                          !tied && aWins ? 'text-white' : 'text-slate-500'
                        )}>
                          {va}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {icon} {label}
                        </span>
                        <span className={clsx(
                          'text-base font-black tabular-nums w-6 text-right',
                          !tied && bWins ? 'text-white' : 'text-slate-500'
                        )}>
                          {vb}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 h-1.5">
                        {/* Barre A (droite vers gauche) */}
                        <div className="flex-1 flex justify-end">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${(va / maxVal) * 100}%`,
                              backgroundColor: !tied && aWins ? a.team.color : 'rgba(255,255,255,0.12)',
                            }}
                          />
                        </div>
                        <div className="w-px h-3 bg-white/10 shrink-0" />
                        {/* Barre B (gauche vers droite) */}
                        <div className="flex-1">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${(vb / maxVal) * 100}%`,
                              backgroundColor: !tied && bWins ? b.team.color : 'rgba(255,255,255,0.12)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Liens profils */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/8">
                <Link
                  to={`/players/${a.id}`}
                  onClick={onClose}
                  className="text-center text-[10px] font-black text-primary-400 hover:text-primary-300 uppercase tracking-wider transition-colors py-2 rounded-xl hover:bg-primary-500/10"
                >
                  Voir profil →
                </Link>
                <Link
                  to={`/players/${b.id}`}
                  onClick={onClose}
                  className="text-center text-[10px] font-black text-primary-400 hover:text-primary-300 uppercase tracking-wider transition-colors py-2 rounded-xl hover:bg-primary-500/10"
                >
                  Voir profil →
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">Données indisponibles</div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerHeader({ player, side = 'left' }: {
  player: { first_name: string; last_name: string; avatar_url: string | null; team: { color: string; name: string } }
  side?: 'left' | 'right'
}) {
  return (
    <div className={clsx('flex flex-col items-center gap-2 text-center', side === 'right' && 'items-center')}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-black overflow-hidden ring-2 ring-white/10"
        style={{ backgroundColor: player.team.color }}>
        {player.avatar_url
          ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
          : `${player.first_name[0]}${player.last_name[0]}`
        }
      </div>
      <div>
        <p className="text-xs font-black text-white leading-tight">{player.first_name} {player.last_name}</p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: player.team.color }} />
          <p className="text-[10px] text-slate-500">{player.team.name}</p>
        </div>
      </div>
    </div>
  )
}

export function PlayersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: players, isLoading: playersLoading } = usePlayers(season?.id)
  const { data: teams } = useTeams(season?.id)

  const [search, setSearch] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterPos, setFilterPos] = useState<PlayerPosition | ''>('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [page, setPage] = useState(1)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id] // remplace le premier
      return [...prev, id]
    })
  }

  // Reset page quand les filtres changent
  useEffect(() => { setPage(1) }, [search, filterTeam, filterPos, sortKey])

  const isLoading = seasonLoading || playersLoading

  const filtered = (players ?? [])
    .filter(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
      return (!search || fullName.includes(search.toLowerCase()))
        && (!filterTeam || p.team_id === filterTeam)
        && (!filterPos || p.position === filterPos)
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

      {/* Modal comparaison */}
      {showCompare && compareIds.length === 2 && season && (
        <CompareModal
          playerAId={compareIds[0]}
          playerBId={compareIds[1]}
          seasonId={season.id}
          onClose={() => setShowCompare(false)}
        />
      )}

      {/* Bannière comparaison flottante */}
      {compareIds.length > 0 && (
        <div className="sticky top-20 z-20 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-primary-500/30 bg-primary-500/10 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2">
            <GitCompare size={14} className="text-primary-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {compareIds.length === 1 ? 'Sélectionne un 2ème joueur' : '2 joueurs sélectionnés'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {compareIds.length === 2 && (
              <button
                onClick={() => setShowCompare(true)}
                className="px-3 py-1.5 rounded-xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary-500 transition-colors"
              >
                Comparer
              </button>
            )}
            <button
              onClick={() => setCompareIds([])}
              className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-wider transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1200&q=80&auto=format&fit=crop"
        pattern="dots"
        accentColor="#06b6d4"
        title="Joueurs"
        subtitle={season?.name}
        icon={<User size={20} className="text-cyan-400" />}
        stats={players?.length ? [
          { label: 'Joueurs', value: players.length },
          { label: 'Équipes', value: teams?.length ?? 0 },
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
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto_auto] gap-2 px-4 py-2 border-b border-surface-border">
            <span className="section-title">#</span>
            <span className="section-title">Joueur</span>
            <span className="section-title hidden sm:block">Équipe</span>
            <span className="section-title hidden md:block">Poste</span>
            <span className="section-title"><GitCompare size={11} className="text-slate-600" /></span>
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
                    'grid grid-cols-[2.5rem_1fr_auto_auto_auto] gap-2 items-center px-4 py-2.5',
                    'hover:bg-surface-raised transition-colors',
                    i < filtered.length - 1 && 'border-b border-surface-border/50',
                    compareIds.includes(p.id) && 'bg-primary-500/8 border-l-2 border-l-primary-500',
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

                  {/* Bouton comparer */}
                  <button
                    onClick={e => { e.preventDefault(); toggleCompare(p.id) }}
                    className={clsx(
                      'p-1.5 rounded-lg transition-colors shrink-0',
                      compareIds.includes(p.id)
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-slate-700 hover:text-slate-400 hover:bg-white/5',
                    )}
                    title={compareIds.includes(p.id) ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
                  >
                    <GitCompare size={13} />
                  </button>
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
