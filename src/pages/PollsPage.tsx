import { useState, useMemo } from 'react'
import { BarChart2, Trophy, Medal, Clock, Lock, Check, X, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { usePolls, useLeaderboard, usePoll } from '@/hooks/usePolls'
import { useActiveSeason } from '@/hooks/useSeasons'
import { PageHero } from '@/components/ui/PageHero'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import clsx from 'clsx'
import type { PollType, MatchWithTeams } from '@/types/database'
import type { PollWithRelations } from '@/hooks/usePolls'

// ─── Catégories de filtrage ────────────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; types: (PollType | 'all')[] }[] = [
  { key: 'all',     label: 'Tous les marchés', types: ['all'] },
  { key: 'winner',  label: 'Vainqueur',        types: ['winner'] },
  { key: 'btts',    label: 'Les 2 marquent',   types: ['btts'] },
  { key: 'goals',   label: 'Buts',             types: ['total_goals', 'goals_home', 'goals_away', 'goals_ht', 'goals_ht_home', 'goals_ht_away'] },
  { key: 'cards',   label: 'Cartons',          types: ['cards_total', 'cards_home', 'cards_away'] },
  { key: 'shots',   label: 'Tirs',             types: ['shots_total', 'shots_home', 'shots_away'] },
  { key: 'corners', label: 'Corners',          types: ['corners'] },
  { key: 'fouls',   label: 'Fautes',           types: ['fouls'] },
  { key: 'custom',  label: 'Sondages',         types: ['custom'] },
]

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

type Tab = 'polls' | 'leaderboard'

// ─── Ligne de marché individuelle ─────────────────────────────────────────────
function MarketRow({ pollId }: { pollId: string }) {
  const { poll, predictions, userPrediction, vote } = usePoll(pollId)
  const [voting, setVoting] = useState(false)

  if (poll.isLoading || !poll.data) return null

  const p = poll.data
  const totalVotes    = predictions.data?.length ?? 0
  const votesByOption = p.options.map((_: string, idx: number) =>
    predictions.data?.filter(v => v.option_index === idx).length ?? 0
  )
  const isActive   = p.status === 'active'
  const isResolved = p.status === 'completed' && p.correct_option_index != null
  const showPct    = p.status !== 'active' || !!userPrediction.data
  const myPick     = userPrediction.data
  const userWon    = isResolved && myPick?.is_correct === true

  const handleVote = async (idx: number) => {
    if (!isActive || voting || myPick) return
    setVoting(true)
    try { await vote.mutateAsync({ optionIndex: idx }) }
    finally { setVoting(false) }
  }

  return (
    <div className={clsx(
      'border-b border-white/[0.05] last:border-0',
      isResolved && userWon && 'bg-green-500/[0.03]',
    )}>
      {/* Question + meta */}
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <span className="text-xs font-semibold text-text-secondary truncate">{p.question}</span>
        <div className="flex items-center gap-2 shrink-0">
          {isResolved && myPick && (
            <span className={clsx(
              'text-[10px] font-black uppercase tracking-wide flex items-center gap-1',
              userWon ? 'text-green-400' : 'text-slate-500'
            )}>
              {userWon
                ? <><Star size={9} fill="currentColor" />+{myPick.points_earned} pts</>
                : <><X size={9} />Raté</>}
            </span>
          )}
          {!isActive && !isResolved && (
            <span className="text-[10px] font-bold text-yellow-500 uppercase flex items-center gap-1">
              <Lock size={9} /> Fermé
            </span>
          )}
          <span className="text-[10px] text-text-muted">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Options style paris */}
      <div className="flex gap-1.5 px-4 pb-3">
        {p.options.map((option: string, idx: number) => {
          const votes      = votesByOption[idx] ?? 0
          const pct        = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          const isMyPick   = myPick?.option_index === idx
          const isCorrect  = isResolved && p.correct_option_index === idx
          const isWrong    = isResolved && isMyPick && !isCorrect
          const canVote    = isActive && !myPick && !voting

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={!canVote}
              className={clsx(
                'relative flex-1 min-w-0 rounded-lg border overflow-hidden transition-all text-left',
                'px-3 py-2',
                isCorrect  ? 'border-green-500/40 bg-green-500/10'
                : isWrong  ? 'border-red-500/30 bg-red-500/5'
                : isMyPick ? 'border-primary-500/50 bg-primary-500/10'
                : canVote  ? 'border-white/[0.08] bg-white/[0.03] hover:border-primary-500/30 hover:bg-primary-500/5 cursor-pointer'
                :            'border-white/[0.05] bg-white/[0.02] cursor-default'
              )}
            >
              {/* Barre de fond */}
              {showPct && (
                <div
                  className={clsx(
                    'absolute inset-y-0 left-0 transition-all opacity-[0.12] rounded-lg',
                    isCorrect ? 'bg-green-500' : isWrong ? 'bg-red-500' : 'bg-primary-500'
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isCorrect && (
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Check size={9} className="text-white" />
                    </div>
                  )}
                  {isWrong && (
                    <div className="w-4 h-4 rounded-full bg-red-500/40 flex items-center justify-center shrink-0">
                      <X size={9} className="text-red-400" />
                    </div>
                  )}
                  {isMyPick && !isResolved && (
                    <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                      <Check size={9} className="text-white" />
                    </div>
                  )}
                  <span className={clsx(
                    'text-xs font-semibold truncate',
                    isCorrect ? 'text-green-400' : isWrong ? 'text-red-400' : isMyPick ? 'text-primary-300' : 'text-text-primary'
                  )}>
                    {option}
                  </span>
                </div>
                {showPct && (
                  <span className={clsx(
                    'text-[10px] font-black shrink-0',
                    isCorrect ? 'text-green-400' : 'text-text-muted'
                  )}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
        {voting && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bloc par match (header scoreboard + liste marchés) ───────────────────────
function MatchMarketBlock({
  matchId,
  match,
  polls,
  activeCategory,
}: {
  matchId: string | null
  match?: MatchWithTeams & { status?: string }
  polls: PollWithRelations[]
  activeCategory: PollType | 'all'
}) {
  const [collapsed, setCollapsed] = useState(false)

  const filtered = activeCategory === 'all'
    ? polls
    : polls.filter(p => {
        const cat = CATEGORIES.find(c => c.key === activeCategory)
        return cat ? (cat.types as string[]).includes(p.poll_type) : true
      })

  if (filtered.length === 0) return null

  const activeCnt   = polls.filter(p => p.status === 'active').length
  const resolvedCnt = polls.filter(p => p.status === 'completed').length

  const matchStatusLabel: Record<string, string> = {
    scheduled: 'À venir', live: 'En direct', completed: 'Terminé', cancelled: 'Annulé',
  }
  const matchStatusColor: Record<string, string> = {
    scheduled: 'text-blue-400',
    live:      'text-green-400',
    completed: 'text-slate-400',
    cancelled: 'text-red-400',
  }

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-surface-panel/40">
      {/* Header match style scoreboard */}
      <button
        className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-surface-raised/60 hover:bg-surface-raised/80 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {match ? (
            <>
              {/* Équipes */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-black text-text-primary truncate text-right flex-1">
                  {match.home_team?.name ?? '?'}
                </span>
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">vs</span>
                  {match.scheduled_at && (
                    <span className="text-[9px] text-text-muted flex items-center gap-0.5 mt-0.5">
                      <Clock size={8} />
                      {new Date(match.scheduled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>
                <span className="text-sm font-black text-text-primary truncate flex-1">
                  {match.away_team?.name ?? '?'}
                </span>
              </div>

              {/* Statut match + compteurs */}
              <div className="flex items-center gap-2 shrink-0">
                {match.status && (
                  <span className={clsx('text-[10px] font-black uppercase tracking-wide', matchStatusColor[match.status] ?? 'text-text-muted')}>
                    {matchStatusLabel[match.status] ?? match.status}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm font-black text-text-muted uppercase tracking-wide">Sans match</span>
          )}
        </div>

        {/* Badges compteurs + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-bold text-text-muted">
            {filtered.length} marché{filtered.length > 1 ? 's' : ''}
          </span>
          {activeCnt > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold border border-green-500/20">
              {activeCnt} ouvert{activeCnt > 1 ? 's' : ''}
            </span>
          )}
          {resolvedCnt > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
              {resolvedCnt} résolu{resolvedCnt > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-text-muted">
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </span>
        </div>
      </button>

      {/* Marchés */}
      {!collapsed && (
        <div className="divide-y divide-white/[0.04]">
          {filtered.map(poll => (
            <MarketRow key={poll.id} pollId={poll.id} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function PollsPage() {
  const [tab, setTab]             = useState<Tab>('polls')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const { data: season }                         = useActiveSeason()
  const { data: polls, isLoading }               = usePolls()
  const { data: leaderboard, isLoading: loadingLb } = useLeaderboard(season?.id)

  // Groupement par match_id
  const groups = useMemo(() => {
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
      const dateA = a.match?.scheduled_at
      const dateB = b.match?.scheduled_at
      if (dateA && dateB) return new Date(dateA).getTime() - new Date(dateB).getTime()
      return 0
    })
  }, [polls])

  // Compter par catégorie pour afficher les totaux dans le menu
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: polls?.length ?? 0 }
    for (const cat of CATEGORIES) {
      if (cat.key === 'all') continue
      counts[cat.key] = (polls ?? []).filter(p => (cat.types as string[]).includes(p.poll_type)).length
    }
    return counts
  }, [polls])

  // Catégories qui ont au moins un poll
  const availableCategories = CATEGORIES.filter(c =>
    c.key === 'all' || (countByCategory[c.key] ?? 0) > 0
  )

  return (
    <div className="space-y-0">
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1461896836934-ffe607ba821?w=1200&q=80&auto=format&fit=crop"
        pattern="lines"
        accentColor="#8b5cf6"
        title="Sondages & Pronostics"
        subtitle="Faites vos pronostics et grimpez au classement !"
        icon={<BarChart2 size={20} className="text-purple-400" />}
        compact
      />

      {/* Onglets principaux */}
      <div className="flex gap-1 border-b border-surface-border px-1">
        {([['polls', 'Pronostics'], ['leaderboard', 'Classement']] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-bold uppercase tracking-widest transition-colors',
              tab === id
                ? 'text-primary-400 border-b-2 border-primary-500 -mb-px'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Onglet Pronostics ── */}
      {tab === 'polls' && (
        <div className="space-y-0 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : !polls?.length ? (
            <div className="card py-12 text-center opacity-50 mt-4">
              <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
              <p className="text-xs font-bold uppercase tracking-widest">Aucun pronostic disponible</p>
            </div>
          ) : (
            <>
              {/* ── Menu catégories style bookmaker ── */}
              <div className="sticky top-0 z-10 bg-surface-panel/90 backdrop-blur-md border-b border-white/[0.06]">
                <div className="overflow-x-auto scrollbar-none">
                  <div className="flex items-center gap-0 min-w-max px-1 py-1">
                    {availableCategories.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all mx-0.5',
                          activeCategory === cat.key
                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                            : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                        )}
                      >
                        {cat.label}
                        <span className={clsx(
                          'text-[9px] font-black px-1.5 py-0.5 rounded-full',
                          activeCategory === cat.key
                            ? 'bg-primary-500/30 text-primary-300'
                            : 'bg-white/[0.06] text-text-muted'
                        )}>
                          {cat.key === 'all' ? countByCategory['all'] : (countByCategory[cat.key] ?? 0)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Blocs par match ── */}
              <div className="space-y-3 mt-4">
                {groups.map(([key, group]) => (
                  <MatchMarketBlock
                    key={key}
                    matchId={key === '__none__' ? null : key}
                    match={group.match}
                    polls={group.polls}
                    activeCategory={activeCategory}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Onglet Classement ── */}
      {tab === 'leaderboard' && (
        <div className="mt-4">
          {loadingLb ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : !leaderboard?.length ? (
            <div className="card py-12 text-center opacity-50">
              <Medal size={32} className="mx-auto mb-3 text-text-muted" />
              <p className="text-xs font-bold uppercase tracking-widest">Aucun pronostic résolu pour le moment</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-raised/50">
                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted w-10">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Joueur</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Points</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted hidden sm:table-cell">Corrects</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted hidden sm:table-cell">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr
                      key={entry.user_id}
                      className={clsx(
                        'border-b border-surface-border/40 last:border-0 transition-colors hover:bg-surface-raised/30',
                        idx === 0 && 'bg-yellow-500/5'
                      )}
                    >
                      <td className="px-4 py-3">
                        {idx < 3
                          ? <Medal size={16} className={MEDAL_COLORS[idx]} />
                          : <span className="text-text-muted font-bold">{idx + 1}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar
                            avatarUrl={entry.avatar_url}
                            firstName={entry.full_name?.split(' ')[0] ?? '?'}
                            lastName={entry.full_name?.split(' ').slice(1).join(' ') ?? ''}
                            size={28}
                          />
                          <span className="font-bold text-text-primary truncate">{entry.full_name ?? 'Anonyme'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-primary-400">{entry.total_points} pts</td>
                      <td className="px-4 py-3 text-right text-text-secondary hidden sm:table-cell">
                        {entry.correct_predictions}/{entry.total_predictions}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={clsx(
                          'font-bold text-xs',
                          entry.success_rate >= 60 ? 'text-green-400' : entry.success_rate >= 40 ? 'text-yellow-400' : 'text-text-muted'
                        )}>
                          {entry.success_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
