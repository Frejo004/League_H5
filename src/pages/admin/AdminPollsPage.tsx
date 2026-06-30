import { useState, useMemo } from 'react'
import {
  BarChart2, Plus, Check, Trash2, Play, Pause, Calendar,
  Zap, ChevronDown, ChevronUp, Clock, Pencil, MoreVertical,
} from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePolls, POLL_TYPE_CONFIG, getWinnerOptions } from '@/hooks/usePolls'
import { useMatches } from '@/hooks/useMatches'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { clsx } from 'clsx'
import type { Poll, PollStatus, PollType, MatchWithTeams } from '@/types/database'
import type { PollWithRelations } from '@/hooks/usePolls'

// ─── Constantes ───────────────────────────────────────────────────────────────

const AUTO_TYPES: Exclude<PollType, 'custom'>[] = [
  'winner', 'btts', 'total_goals',
  'goals_home', 'goals_away',
  'goals_ht', 'goals_ht_home', 'goals_ht_away',
  'cards_total', 'cards_home', 'cards_away',
  'shots_total', 'shots_home', 'shots_away',
  'corners', 'fouls',
]

const POLL_TYPE_LABELS: Record<PollType, string> = {
  custom:           'Sondage libre',
  winner:           'Vainqueur',
  btts:             'Les 2 équipes marquent',
  total_goals:      'Total buts',
  goals_home:       'Buts domicile',
  goals_away:       'Buts extérieur',
  goals_ht:         'Buts MT total',
  goals_ht_home:    'Buts domicile MT',
  goals_ht_away:    'Buts extérieur MT',
  cards_total:      'Cartons total',
  cards_home:       'Cartons domicile',
  cards_away:       'Cartons extérieur',
  shots_total:      'Tirs total',
  shots_home:       'Tirs domicile',
  shots_away:       'Tirs extérieur',
  corners:          'Corners',
  fouls:            'Fautes',
  first_scorer:     'Premier buteur',
  anytime_scorer:   'Buteur dans le match',
  anytime_assister: 'Passeur décisif',
}

const CATEGORIES: { key: string; label: string; types: (PollType | 'all')[] }[] = [
  { key: 'all',      label: 'Tous',           types: ['all'] },
  { key: 'winner',   label: 'Vainqueur',      types: ['winner'] },
  { key: 'btts',     label: 'Les 2 marquent', types: ['btts'] },
  { key: 'goals',    label: 'Buts',           types: ['total_goals', 'goals_home', 'goals_away', 'goals_ht', 'goals_ht_home', 'goals_ht_away'] },
  { key: 'cards',    label: 'Cartons',        types: ['cards_total', 'cards_home', 'cards_away'] },
  { key: 'shots',    label: 'Tirs',           types: ['shots_total', 'shots_home', 'shots_away'] },
  { key: 'corners',  label: 'Corners',        types: ['corners'] },
  { key: 'fouls',    label: 'Fautes',         types: ['fouls'] },
  { key: 'scorers',  label: 'Buteurs',        types: ['first_scorer', 'anytime_scorer'] },
  { key: 'assisters',label: 'Passeurs',       types: ['anytime_assister'] },
  { key: 'custom',   label: 'Sondages',       types: ['custom'] },
]

const POLL_STATUS_STYLE: Record<PollStatus, { badge: string; label: string }> = {
  draft:     { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   label: 'Brouillon' },
  active:    { badge: 'bg-green-500/10 text-green-400 border-green-500/20',   label: 'Actif' },
  closed:    { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Fermé' },
  completed: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',      label: 'Terminé' },
}

// ─── Ligne de marché admin ────────────────────────────────────────────────────
function AdminMarketRow({
  poll,
  onEdit,
  onDelete,
  onActivate,
  onClose,
}: {
  poll: PollWithRelations
  onEdit: (p: Poll) => void
  onDelete: (id: string) => void
  onActivate: (id: string) => void
  onClose: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const st = POLL_STATUS_STYLE[poll.status]

  return (
    <div className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors relative">
      {/* Ligne principale */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Badges statut + type */}
        <div className="flex flex-col gap-1 items-start pt-0.5 shrink-0 w-[110px]">
          <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border', st.badge)}>
            {st.label}
          </span>
          {poll.poll_type !== 'custom' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 text-[9px] font-black uppercase tracking-wide border border-primary-500/20">
              {POLL_TYPE_LABELS[poll.poll_type]}
            </span>
          )}
        </div>

        {/* Question + options */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-snug mb-2">{poll.question}</p>
          <div className="flex flex-wrap gap-1.5">
            {poll.options.map((opt: string, idx: number) => (
              <span
                key={idx}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border',
                  poll.correct_option_index === idx
                    ? 'bg-green-500/15 text-green-400 border-green-500/30 font-bold'
                    : 'bg-white/[0.04] text-text-muted border-white/[0.07]'
                )}
              >
                {opt}
              </span>
            ))}
          </div>
          {poll.ends_at && (
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-text-muted">
              <Calendar size={9} />
              Fermeture : {new Date(poll.ends_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {poll.correct_option_index != null && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-green-400 font-bold">
              <Check size={9} /> Résultat : {poll.options[poll.correct_option_index]}
            </p>
          )}
        </div>

        {/* Contrôles */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {/* Activer / Fermer inline */}
          {poll.status === 'draft' && (
            <button
              onClick={() => onActivate(poll.id)}
              title="Activer"
              className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
            >
              <Play size={13} />
            </button>
          )}
          {poll.status === 'active' && (
            <button
              onClick={() => onClose(poll.id)}
              title="Fermer les votes"
              className="p-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors"
            >
              <Pause size={13} />
            </button>
          )}

          {/* Menu contextuel ⋮ */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary transition-colors"
              title="Plus d'actions"
            >
              <MoreVertical size={13} />
            </button>
            {menuOpen && (
              <>
                {/* Overlay pour fermer */}
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 w-36 rounded-xl border border-white/[0.08] bg-surface-raised shadow-xl overflow-hidden">
                  <button
                    onClick={() => { onEdit(poll); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors"
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                  <button
                    onClick={() => { onDelete(poll.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Bloc match (header scoreboard + lignes de marchés) ───────────────────────
function AdminMatchBlock({
  matchId,
  match,
  polls,
  onEdit,
  onDelete,
  onActivate,
  onClose,
  onDeleteMatch,
}: {
  matchId: string | null
  match?: MatchWithTeams & { status?: string }
  polls: PollWithRelations[]
  onEdit: (p: Poll) => void
  onDelete: (id: string) => void
  onActivate: (id: string) => void
  onClose: (id: string) => void
  onDeleteMatch: (matchId: string | null) => void
}) {
  const [collapsed, setCollapsed]           = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Comptage par catégorie pour CE match uniquement
  const countByCategory = useMemo(() => {
    const c: Record<string, number> = { all: polls.length }
    for (const cat of CATEGORIES) {
      if (cat.key === 'all') continue
      c[cat.key] = polls.filter(p => (cat.types as string[]).includes(p.poll_type)).length
    }
    return c
  }, [polls])

  const availableCategories = CATEGORIES.filter(
    c => c.key === 'all' || (countByCategory[c.key] ?? 0) > 0
  )

  const filtered = activeCategory === 'all'
    ? polls
    : polls.filter(p => {
        const cat = CATEGORIES.find(c => c.key === activeCategory)
        return cat ? (cat.types as string[]).includes(p.poll_type) : true
      })

  const activeCnt   = polls.filter(p => p.status === 'active').length
  const draftCnt    = polls.filter(p => p.status === 'draft').length
  const resolvedCnt = polls.filter(p => p.status === 'completed').length

  const matchStatusColor: Record<string, string> = {
    scheduled: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    live:      'text-green-400 bg-green-500/10 border-green-500/20',
    completed: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
  }
  const matchStatusLabel: Record<string, string> = {
    scheduled: 'Programmé', live: 'En direct', completed: 'Terminé', cancelled: 'Annulé',
  }

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-surface-panel/40">
      {/* Header match */}
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-surface-raised/60 hover:bg-surface-raised/80 transition-colors text-left"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {match ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-black text-text-primary uppercase tracking-wide truncate flex-1 text-right">
                {match.home_team?.name ?? '?'}
              </span>
              <div className="flex flex-col items-center shrink-0 px-1">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">vs</span>
                {match.scheduled_at && (
                  <span className="text-[9px] text-text-muted flex items-center gap-0.5 mt-0.5">
                    <Clock size={8} />
                    {new Date(match.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {match.matchday && (
                  <span className="text-[9px] text-text-muted font-bold">J{match.matchday}</span>
                )}
              </div>
              <span className="text-sm font-black text-text-primary uppercase tracking-wide truncate flex-1">
                {match.away_team?.name ?? '?'}
              </span>
              {match.status && (
                <span className={clsx('text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0', matchStatusColor[match.status] ?? 'text-text-muted')}>
                  {matchStatusLabel[match.status] ?? match.status}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-black text-text-muted uppercase tracking-wide">Sans match</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-text-muted font-bold">{polls.length} marché{polls.length > 1 ? 's' : ''}</span>
          {activeCnt > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[9px] font-bold border border-green-500/20">
              {activeCnt} actif{activeCnt > 1 ? 's' : ''}
            </span>
          )}
          {draftCnt > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[9px] font-bold border border-slate-500/20">
              {draftCnt} brouillon{draftCnt > 1 ? 's' : ''}
            </span>
          )}
          {resolvedCnt > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-bold border border-blue-500/20">
              {resolvedCnt} résolu{resolvedCnt > 1 ? 's' : ''}
            </span>
          )}
          {matchId !== null && (
            <button
              onClick={e => { e.stopPropagation(); onDeleteMatch(matchId) }}
              title="Supprimer tous les pronostics de ce match"
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
          <span className="text-text-muted">
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </span>
        </div>
      </button>

      {!collapsed && (
        <>
          {/* ── Menu catégories interne au match (s'affiche seulement s'il y a plusieurs types) ── */}
          {availableCategories.length > 2 && (
            <div className="border-b border-white/[0.05] bg-black/10 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-0 min-w-max px-2 py-1.5">
                {availableCategories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all mx-0.5',
                      activeCategory === cat.key
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                    )}
                  >
                    {cat.label}
                    <span className={clsx(
                      'text-[9px] font-black px-1 py-0.5 rounded-full ml-0.5',
                      activeCategory === cat.key ? 'bg-primary-500/30 text-primary-300' : 'bg-white/[0.05] text-text-muted'
                    )}>
                      {cat.key === 'all' ? polls.length : (countByCategory[cat.key] ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Lignes de marchés ── */}
          <div>
            {filtered.map(poll => (
              <AdminMarketRow
                key={poll.id}
                poll={poll}
                onEdit={onEdit}
                onDelete={onDelete}
                onActivate={onActivate}
                onClose={onClose}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Panel génération automatique ─────────────────────────────────────────────
function AutoCreatePanel({ matches }: { matches: MatchWithTeams[] }) {
  const { createMatchPolls, createPlayerPolls } = usePolls()
  const [selectedMatch, setSelectedMatch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<Exclude<PollType, 'custom'>>>(
    new Set(['winner', 'btts', 'total_goals'])
  )
  const [selectedPlayerTypes, setSelectedPlayerTypes] = useState<Set<'first_scorer' | 'anytime_scorer' | 'anytime_assister'>>(new Set())
  const [success, setSuccess] = useState(false)

  const isPending = createMatchPolls.isPending || createPlayerPolls.isPending
  const totalSelected = selectedTypes.size + selectedPlayerTypes.size

  const PLAYER_POLL_TYPES: { key: 'first_scorer' | 'anytime_scorer' | 'anytime_assister'; label: string }[] = [
    { key: 'first_scorer',     label: 'Premier buteur' },
    { key: 'anytime_scorer',   label: 'Buteur dans le match' },
    { key: 'anytime_assister', label: 'Passeur décisif' },
  ]

  const toggleType = (t: Exclude<PollType, 'custom'>) =>
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) {
        next.delete(t)
      } else {
        next.add(t)
      }
      return next
    })

  const togglePlayerType = (t: 'first_scorer' | 'anytime_scorer' | 'anytime_assister') =>
    setSelectedPlayerTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) {
        next.delete(t)
      } else {
        next.add(t)
      }
      return next
    })

  const match = matches.find(m => m.id === selectedMatch)

  async function handleCreate() {
    if (!match) return
    if (selectedTypes.size === 0 && selectedPlayerTypes.size === 0) return

    // Pronostics stats classiques
    if (selectedTypes.size > 0) {
      await createMatchPolls.mutateAsync({
        matchId: match.id,
        homeName: match.home_team?.name ?? 'Domicile',
        awayName: match.away_team?.name ?? 'Extérieur',
        scheduledAt: match.scheduled_at,
        types: [...selectedTypes],
      })
    }

    // Pronostics joueurs (buteur/passeur)
    if (selectedPlayerTypes.size > 0) {
      await createPlayerPolls.mutateAsync({
        matchId: match.id,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeName: match.home_team?.name ?? 'Domicile',
        awayName: match.away_team?.name ?? 'Extérieur',
        scheduledAt: match.scheduled_at,
        types: [...selectedPlayerTypes],
      })
    }

    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="card border-yellow-500/20 bg-yellow-500/5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-yellow-400" />
        <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">Génération automatique par match</h3>
      </div>

      {/* Match */}
      <div>
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Match</label>
        <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)} className="input">
          <option value="">Sélectionner un match...</option>
          {matches.map(m => (
            <option key={m.id} value={m.id}>
              {m.home_team?.name} vs {m.away_team?.name}
              {m.scheduled_at ? ` — ${new Date(m.scheduled_at).toLocaleDateString('fr-FR')}` : ''}
            </option>
          ))}
        </select>
      </div>

      {match && selectedTypes.has('winner') && (
        <div className="flex items-center gap-2 text-[10px] text-text-muted flex-wrap">
          <span className="font-bold text-yellow-400">Options Vainqueur :</span>
          {getWinnerOptions(match.home_team?.name ?? '', match.away_team?.name ?? '').map((o, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-surface-raised border border-surface-border">{o}</span>
          ))}
        </div>
      )}

      {/* Types stats classiques */}
      <div>
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">
          Statistiques ({selectedTypes.size} sélectionnés)
        </label>
        <div className="flex flex-wrap gap-2">
          {AUTO_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-all',
                selectedTypes.has(type)
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                  : 'bg-surface-raised border-surface-border text-text-muted hover:border-slate-500'
              )}
            >
              {POLL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Types joueurs */}
      <div>
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block flex items-center gap-1">
          Buteur / Passeur ({selectedPlayerTypes.size} sélectionnés)
          <span className="text-[9px] text-text-muted normal-case">— options générées depuis les joueurs du match</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PLAYER_POLL_TYPES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => togglePlayerType(key)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-all',
                selectedPlayerTypes.has(key)
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                  : 'bg-surface-raised border-surface-border text-text-muted hover:border-slate-500'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {selectedPlayerTypes.size > 0 && !selectedMatch && (
          <p className="text-[10px] text-orange-400 mt-1.5">Sélectionne un match pour récupérer les joueurs automatiquement.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCreate}
          disabled={!selectedMatch || totalSelected === 0 || isPending}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest"
        >
          {isPending ? <LoadingSpinner size="sm" /> : <Zap size={14} />}
          Générer {totalSelected} pronostic{totalSelected > 1 ? 's' : ''}
        </button>
        {success && <span className="text-green-400 text-xs font-bold">✓ Pronostics créés !</span>}
        {(createMatchPolls.isError || createPlayerPolls.isError) && (
          <span className="text-red-400 text-xs font-bold">Erreur lors de la création</span>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export function AdminPollsPage() {
  const { data: season } = useActiveSeason()
  const { data: polls, isLoading, createPoll, updatePoll, deletePoll, deleteAllPolls, deleteAllPollsByMatch } = usePolls()
  const { data: matches } = useMatches(season?.id)

  const [showForm, setShowForm]           = useState(false)
  const [showAutoCreate, setShowAutoCreate] = useState(false)
  const [editingPoll, setEditingPoll]     = useState<Poll | null>(null)

  // Modales
  const [confirmDeleteId, setConfirmDeleteId]         = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll]         = useState(false)
  const [confirmDeleteMatchId, setConfirmDeleteMatchId] = useState<string | '__none__' | undefined>()

  // Form state
  const [question, setQuestion]     = useState('')
  const [optionsStr, setOptionsStr] = useState('')
  const [matchId, setMatchId]       = useState<string>('')
  const [pollType, setPollType]     = useState<PollType>('custom')
  const [status, setStatus]         = useState<PollStatus>('draft')
  const [endsAt, setEndsAt]         = useState('')

  const scheduledMatches = matches?.filter(m => m.status === 'scheduled') ?? []

  // Groupement par match
  const pollGroups = useMemo(() => {
    if (!polls) return []
    const map = new Map<string, { polls: PollWithRelations[]; match?: MatchWithTeams & { status?: string } }>()
    for (const poll of polls) {
      const key = poll.match_id ?? '__none__'
      if (!map.has(key)) {
        map.set(key, {
          polls: [],
          match: poll.match as (MatchWithTeams & { status?: string }) | undefined,
        })
      }
      map.get(key)!.polls.push(poll)
    }
    return [...map.entries()].sort(([keyA, a], [keyB, b]) => {
      if (keyA === '__none__') return 1
      if (keyB === '__none__') return -1
      const da = a.match?.scheduled_at
      const db = b.match?.scheduled_at
      if (da && db) return new Date(da).getTime() - new Date(db).getTime()
      return 0
    })
  }, [polls])

  const matchLabelByKey = (key: string) =>
    pollGroups.find(([k]) => k === key)?.[1].match
      ? `${pollGroups.find(([k]) => k === key)?.[1].match?.home_team?.name} vs ${pollGroups.find(([k]) => k === key)?.[1].match?.away_team?.name}`
      : ''

  function handleTypeChange(type: PollType) {
    setPollType(type)
    if (type === 'custom' || !matchId) return
    const m = matches?.find(m => m.id === matchId)
    if (!m) return
    const h = m.home_team?.name ?? 'Domicile', a = m.away_team?.name ?? 'Extérieur'
    if (type === 'winner') { setQuestion(POLL_TYPE_CONFIG.winner.question(h, a)); setOptionsStr(getWinnerOptions(h, a).join('\n')) }
    else { const cfg = POLL_TYPE_CONFIG[type as Exclude<PollType,'custom'>]; setQuestion(cfg.question(h,a)); setOptionsStr(cfg.options.join('\n')) }
  }

  function handleMatchChange(id: string) {
    setMatchId(id)
    if (pollType === 'custom' || !id) return
    const m = matches?.find(m => m.id === id)
    if (!m) return
    const h = m.home_team?.name ?? 'Domicile', a = m.away_team?.name ?? 'Extérieur'
    if (pollType === 'winner') { setQuestion(POLL_TYPE_CONFIG.winner.question(h, a)); setOptionsStr(getWinnerOptions(h, a).join('\n')) }
    else { const cfg = POLL_TYPE_CONFIG[pollType as Exclude<PollType,'custom'>]; if (cfg) { setQuestion(cfg.question(h,a)); setOptionsStr(cfg.options.join('\n')) } }
    if (m.scheduled_at) setEndsAt(new Date(m.scheduled_at).toISOString().slice(0, 16))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const options = optionsStr.split('\n').filter(s => s.trim()).map(s => s.trim())
    if (!question || options.length < 2) return
    const payload = { question, options, match_id: matchId || null, poll_type: pollType, status, starts_at: null, ends_at: endsAt || null }
    if (editingPoll) await updatePoll.mutateAsync({ id: editingPoll.id, ...payload })
    else await createPoll.mutateAsync(payload)
    resetForm()
  }

  const resetForm = () => {
    setEditingPoll(null); setQuestion(''); setOptionsStr(''); setMatchId('')
    setPollType('custom'); setStatus('draft'); setEndsAt(''); setShowForm(false)
  }

  const handleEdit = (poll: Poll) => {
    setEditingPoll(poll); setQuestion(poll.question); setOptionsStr(poll.options.join('\n'))
    setMatchId(poll.match_id || ''); setPollType(poll.poll_type); setStatus(poll.status)
    setEndsAt(poll.ends_at || ''); setShowForm(true); setShowAutoCreate(false)
  }

  if (!season) {
    return (
      <div className="card py-12 text-center opacity-50">
        <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
        <p className="text-xs font-bold uppercase tracking-widest">Aucune saison active</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="text-primary-500" size={20} />
            Sondages & Pronostics
          </h2>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-widest mt-1">
            {polls?.length ?? 0} sondage{(polls?.length ?? 0) > 1 ? 's' : ''} — résolution automatique à la fin des matchs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(polls?.length ?? 0) > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              disabled={deleteAllPolls.isPending}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
            >
              {deleteAllPolls.isPending ? <LoadingSpinner size="sm" /> : <Trash2 size={14} />}
              Tout supprimer
            </button>
          )}
          <button
            onClick={() => { setShowAutoCreate(!showAutoCreate); setShowForm(false) }}
            className={clsx('btn-secondary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest', showAutoCreate && 'border-yellow-500/40 text-yellow-400')}
          >
            <Zap size={14} />
            Auto
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowAutoCreate(false); resetForm() }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest"
          >
            <Plus size={14} />
            Manuel
          </button>
        </div>
      </div>

      {/* ── Panel auto-création ── */}
      {showAutoCreate && (
        scheduledMatches.length > 0
          ? <AutoCreatePanel matches={scheduledMatches as MatchWithTeams[]} />
          : <div className="card py-8 text-center opacity-50"><p className="text-xs font-bold uppercase tracking-widest">Aucun match programmé</p></div>
      )}

      {/* ── Formulaire manuel ── */}
      {showForm && (
        <div className="card border-primary-500/30 bg-primary-500/5 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Type de pronostic</label>
                <select value={pollType} onChange={e => handleTypeChange(e.target.value as PollType)} className="input">
                  <option value="custom">Sondage libre</option>
                  <optgroup label="── Résultats ──">
                    <option value="winner">Vainqueur</option>
                    <option value="btts">Les 2 équipes marquent</option>
                  </optgroup>
                  <optgroup label="── Buts ──">
                    <option value="total_goals">Total buts</option>
                    <option value="goals_home">Buts domicile</option>
                    <option value="goals_away">Buts extérieur</option>
                    <option value="goals_ht">Buts MT total</option>
                    <option value="goals_ht_home">Buts domicile MT</option>
                    <option value="goals_ht_away">Buts extérieur MT</option>
                  </optgroup>
                  <optgroup label="── Discipline ──">
                    <option value="cards_total">Cartons total</option>
                    <option value="cards_home">Cartons domicile</option>
                    <option value="cards_away">Cartons extérieur</option>
                  </optgroup>
                  <optgroup label="── Jeu ──">
                    <option value="shots_total">Tirs total</option>
                    <option value="shots_home">Tirs domicile</option>
                    <option value="shots_away">Tirs extérieur</option>
                    <option value="corners">Corners</option>
                    <option value="fouls">Fautes</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Match (optionnel)</label>
                <select value={matchId} onChange={e => handleMatchChange(e.target.value)} className="input">
                  <option value="">Aucun</option>
                  {scheduledMatches.map(m => (
                    <option key={m.id} value={m.id}>{m.home_team?.name} vs {m.away_team?.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Question</label>
                <input type="text" value={question} onChange={e => setQuestion(e.target.value)} className="input" placeholder="Qui va gagner ce match ?" required />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Options (une par ligne)</label>
                <textarea value={optionsStr} onChange={e => setOptionsStr(e.target.value)} className="input min-h-[100px]" placeholder={'Option 1\nOption 2\nOption 3'} required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as PollStatus)} className="input">
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="closed">Fermé</option>
                  <option value="completed">Terminé</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Fermeture (optionnel)</label>
                <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={resetForm} className="btn-secondary px-4 py-2 text-xs font-bold uppercase">Annuler</button>
              <button type="submit" disabled={createPoll.isPending || updatePoll.isPending} className="btn-primary px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
                {createPoll.isPending || updatePoll.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                {editingPoll ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Liste par match ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : !polls?.length ? (
        <div className="card py-12 text-center opacity-50">
          <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-xs font-bold uppercase tracking-widest">Aucun sondage</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pollGroups.map(([key, group]) => (
            <AdminMatchBlock
              key={key}
              matchId={key === '__none__' ? null : key}
              match={group.match}
              polls={group.polls}
              onEdit={handleEdit}
              onDelete={id => setConfirmDeleteId(id)}
              onActivate={id => updatePoll.mutate({ id, status: 'active' })}
              onClose={id => updatePoll.mutate({ id, status: 'closed' })}
              onDeleteMatch={mid => setConfirmDeleteMatchId(mid ?? '__none__')}
            />
          ))}
        </div>
      )}

      {/* ── Modales ── */}
      {confirmDeleteId && (
        <ConfirmModal
          message="Supprimer ce pronostic ? Cette action est irréversible et effacera également tous les paris associés."
          confirmLabel="Supprimer"
          danger
          onConfirm={() => { deletePoll.mutate(confirmDeleteId); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      {confirmDeleteMatchId !== undefined && (
        <ConfirmModal
          message={
            confirmDeleteMatchId === '__none__'
              ? 'Supprimer tous les pronostics sans match associé ? Tous les paris des joueurs seront également supprimés.'
              : `Supprimer tous les pronostics de "${matchLabelByKey(confirmDeleteMatchId)}" ? Tous les paris des joueurs seront également supprimés.`
          }
          confirmLabel="Supprimer"
          danger
          onConfirm={() => {
            if (confirmDeleteMatchId && confirmDeleteMatchId !== '__none__') deleteAllPollsByMatch.mutate(confirmDeleteMatchId)
            setConfirmDeleteMatchId(undefined)
          }}
          onCancel={() => setConfirmDeleteMatchId(undefined)}
        />
      )}
      {confirmDeleteAll && (
        <ConfirmModal
          message={`Supprimer tous les ${polls?.length ?? 0} sondages de la saison ? Tous les paris des joueurs seront également supprimés.`}
          confirmLabel="Tout supprimer"
          danger
          onConfirm={() => { if (season) deleteAllPolls.mutate(season.id); setConfirmDeleteAll(false) }}
          onCancel={() => setConfirmDeleteAll(false)}
        />
      )}
    </div>
  )
}
