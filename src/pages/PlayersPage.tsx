import { useState, useEffect } from 'react'
import { User, Search, ChevronDown, Crown, GitCompare, ChevronRight, ChevronLeft } from 'lucide-react'
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

type SortKey = 'name' | 'jersey' | 'position'
const PAGE_SIZE = 10

// ─────────────────────────────────────────────────────────────────────────────
// CompareModal — comparaison côte à côte de 2 joueurs
// ─────────────────────────────────────────────────────────────────────────────

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
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl bg-surface-muted/30 border border-surface-border flex items-center justify-center overflow-hidden">
                    {a.avatar_url ? <img src={a.avatar_url} className="w-full h-full object-cover" /> : <User size={32} className="text-text-muted" />}
                  </div>
                  <p className="text-sm font-black text-text-primary uppercase tracking-tight text-center">{a.last_name}</p>
                </div>
                <div className="px-4 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
                  <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">VS</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl bg-surface-muted/30 border border-surface-border flex items-center justify-center overflow-hidden">
                    {b.avatar_url ? <img src={b.avatar_url} className="w-full h-full object-cover" /> : <User size={32} className="text-text-muted" />}
                  </div>
                  <p className="text-sm font-black text-text-primary uppercase tracking-tight text-center">{b.last_name}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                {stats.map(({ label, a: va, b: vb, icon, lowerIsBetter }) => {
                  const maxVal = Math.max(va, vb, 1)
                  const aWins = lowerIsBetter ? va < vb : va > vb
                  const bWins = lowerIsBetter ? vb < va : vb > va
                  const tied = va === vb

                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex justify-between px-1">
                        <span className={clsx("text-xs font-black tabular-nums", !tied && aWins ? "text-primary-500" : "text-text-primary")}>{va}</span>
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em]">{icon} {label}</span>
                        <span className={clsx("text-xs font-black tabular-nums", !tied && bWins ? "text-primary-500" : "text-text-primary")}>{vb}</span>
                      </div>
                      <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-surface-muted/30 gap-0.5">
                        <div className={clsx("h-full transition-all duration-1000", !tied && aWins ? "bg-primary-500" : "bg-text-muted/20")} style={{ width: `${(va / maxVal) * 50}%` }} />
                        <div className={clsx("h-full transition-all duration-1000", !tied && bWins ? "bg-primary-500" : "bg-text-muted/20")} style={{ width: `${(vb / maxVal) * 50}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Liens profils */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/8">
                <Link
                  to={`/players/${a.slug || a.id}`}
                  onClick={onClose}
                  className="text-center text-[10px] font-black text-primary-400 hover:text-primary-300 uppercase tracking-wider transition-colors py-2 rounded-xl hover:bg-primary-500/10"
                >
                  Voir profil →
                </Link>
                <Link
                  to={`/players/${b.slug || b.id}`}
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

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }
  const handleFilterTeamChange = (value: string) => {
    setFilterTeam(value)
    setPage(1)
  }
  const handleFilterPosChange = (value: PlayerPosition | '') => {
    setFilterPos(value)
    setPage(1)
  }
  const handleSortKeyChange = (value: SortKey) => {
    setSortKey(value)
    setPage(1)
  }
  const resetFilters = () => {
    setSearch('')
    setFilterTeam('')
    setFilterPos('')
    setPage(1)
  }

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id] // remplace le premier
      return [...prev, id]
    })
  }

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

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const hasFilters = !!search || !!filterTeam || !!filterPos

  return (
    <div className="space-y-3 pb-20">

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
        <div className="sticky top-20 z-20 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-primary-500/30 bg-surface-card/90 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2">
            <GitCompare size={14} className="text-primary-400" />
            <span className="text-xs font-black text-text-primary uppercase tracking-wider">
              {compareIds.length === 1 ? 'Sélectionne un 2ème joueur' : '2 joueurs sélectionnés'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {compareIds.length === 2 && (
              <button
                onClick={() => setShowCompare(true)}
                className="px-3 py-1.5 rounded-xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary-500 transition-all active:scale-95"
              >
                Comparer
              </button>
            )}
            <button
              onClick={() => setCompareIds([])}
              className="text-[10px] font-black text-text-muted hover:text-text-primary uppercase tracking-wider transition-colors"
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un joueur…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="input input-icon-l py-2 text-sm bg-surface-card border-surface-border/50 focus:border-primary-500/50"
            />
          </div>

          {/* Team filter */}
          <div className="relative">
            <select
              value={filterTeam}
              onChange={e => handleFilterTeamChange(e.target.value)}
              className="input py-2 text-sm pr-8 appearance-none cursor-pointer bg-surface-card border-surface-border/50 focus:border-primary-500/50"
              style={{ minWidth: 140 }}
            >
              <option value="">Toutes les équipes</option>
              {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Position filter */}
          <div className="relative">
            <select
              value={filterPos}
              onChange={e => handleFilterPosChange(e.target.value as PlayerPosition | '')}
              className="input py-2 text-sm pr-8 appearance-none cursor-pointer bg-surface-card border-surface-border/50 focus:border-primary-500/50"
              style={{ minWidth: 130 }}
            >
              <option value="">Tous les postes</option>
              {(Object.entries(POSITION_LABELS) as [PlayerPosition, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={e => handleSortKeyChange(e.target.value as SortKey)}
              className="input py-2 text-sm pr-8 appearance-none cursor-pointer bg-surface-card border-surface-border/50 focus:border-primary-500/50"
              style={{ minWidth: 120 }}
            >
              <option value="name">Trier : Nom</option>
              <option value="jersey">Trier : N°</option>
              <option value="position">Trier : Poste</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Reset */}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="btn-secondary py-2 text-xs px-4 rounded-xl border-surface-border/50"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Compteur */}
      {!isLoading && hasFilters && (
        <p className="text-xs text-text-muted animate-fade-in">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          {search && <> pour « <span className="text-text-secondary">{search}</span> »</>}
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
            <p className="text-text-muted">Aucune saison active</p>
          </div>
        </div>
      ) : !filtered.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><User size={20} /></div>
            <p className="text-text-muted">
              {players?.length ? 'Aucun résultat.' : 'Aucun joueur enregistré.'}
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="btn-secondary text-xs mt-2"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border border-surface-border/50">
          {/* Header row */}
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto_auto] gap-2 px-4 py-2 border-b border-surface-border bg-surface-muted/10">
            <span className="section-title text-[10px] font-black text-text-muted uppercase tracking-widest">#</span>
            <span className="section-title text-[10px] font-black text-text-muted uppercase tracking-widest">Joueur</span>
            <span className="section-title text-[10px] font-black text-text-muted uppercase tracking-widest hidden sm:block">Équipe</span>
            <span className="section-title text-[10px] font-black text-text-muted uppercase tracking-widest hidden md:block">Poste</span>
            <span className="section-title"><GitCompare size={11} className="text-text-muted" /></span>
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
                  to={`/players/${p.slug || p.id}`}
                  className={clsx(
                    'grid grid-cols-[2.5rem_1fr_auto_auto_auto] gap-2 items-center px-4 py-2.5 transition-all',
                    'hover:bg-surface-muted/20',
                    i < filtered.length - 1 && 'border-b border-surface-border/30',
                    compareIds.includes(p.id) && 'bg-primary-500/5 border-l-2 border-l-primary-500',
                  )}
                >
                  <span className="text-sm text-text-muted/60 font-mono text-center">
                    {p.jersey_number ?? '—'}
                  </span>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden relative shadow-sm"
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
                      <span className="text-sm text-text-primary font-medium truncate group-hover:text-primary-400">
                        {p.first_name} {p.last_name}
                      </span>
                      {isCaptain && (
                        <span className="badge bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] px-1.5 py-0.5 shrink-0">
                          Capitaine
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5">
                    {team && (
                      <>
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0 shadow-xs" style={{ backgroundColor: team.color }} />
                        <span className="text-xs text-text-muted truncate max-w-[80px]">{team.name}</span>
                      </>
                    )}
                  </div>

                  <div className="hidden md:block">
                    {p.position ? (
                      <span className={clsx(
                        'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border',
                        p.position === 'goalkeeper' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                        p.position === 'forward' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                        p.position === 'midfielder' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                        'text-blue-400 bg-blue-400/10 border-blue-400/20'
                      )}>
                        {POSITION_LABELS[p.position]}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </div>

                  {/* Bouton comparer */}
                  <button
                    onClick={e => { e.preventDefault(); toggleCompare(p.id) }}
                    className={clsx(
                      'p-1.5 rounded-lg transition-all shrink-0 border',
                      compareIds.includes(p.id)
                        ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                        : 'text-text-muted/40 hover:text-text-primary hover:bg-surface-muted/30 border-transparent',
                    )}
                    title={compareIds.includes(p.id) ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
                  >
                    <GitCompare size={13} />
                  </button>
                </Link>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-surface-border/30 bg-surface-muted/5">
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-muted">
                  Page <span className="text-text-primary font-bold">{page}</span> sur <span className="text-text-primary font-bold">{totalPages}</span>
                </p>
                <span className="text-text-muted/30 text-xs">·</span>
                <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-60">
                  {filtered.length} joueurs total
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    page === 1 
                      ? "text-text-muted/40 cursor-not-allowed bg-surface-muted/10 border border-surface-border/20" 
                      : "text-text-primary hover:bg-surface-muted/50 border border-surface-border active:scale-95"
                  )}
                >
                  <ChevronLeft size={14} />
                  Précédent
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    // Logique simple pour afficher les pages autour de la page courante
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (page > 3) pageNum = page - 2 + i;
                      if (page > totalPages - 2) pageNum = totalPages - 4 + i;
                    }
                    if (pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={clsx(
                          "w-8 h-8 rounded-lg text-xs font-black transition-all",
                          page === pageNum 
                            ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20" 
                            : "text-text-muted hover:text-text-primary hover:bg-surface-muted/50"
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    page === totalPages 
                      ? "text-text-muted/40 cursor-not-allowed bg-surface-muted/10 border border-surface-border/20" 
                      : "text-text-primary hover:bg-surface-muted/50 border border-surface-border active:scale-95"
                  )}
                >
                  Suivant
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
