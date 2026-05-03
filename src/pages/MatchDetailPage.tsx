import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Star, Trophy } from 'lucide-react'
import { useMatch } from '@/hooks/useMatches'
import { useMvpVotes, useMyMvpVote, useVoteMvp } from '@/hooks/useMvpVotes'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Date inconnue'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

interface GoalEntry {
  id: string
  minute: number | null
  is_own_goal: boolean
  team_id: string
  players: { id: string; first_name: string; last_name: string; jersey_number: number | null } | null
}

interface AssistEntry {
  id: string
  goal_id: string
  players: { id: string; first_name: string; last_name: string } | null
}

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: match, isLoading } = useMatch(id)
  const { data: votes } = useMvpVotes(id)
  const { data: myVote } = useMyMvpVote(id, user?.id)
  const voteMvp = useVoteMvp()

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="card text-center py-16">
        <p className="text-slate-400">Match introuvable.</p>
        <Link to="/matches" className="btn-secondary mt-4 inline-flex">← Retour aux matchs</Link>
      </div>
    )
  }

  const home = match.home_team as { id: string; name: string; color: string }
  const away = match.away_team as { id: string; name: string; color: string }
  const goals = (match.goals ?? []) as unknown as GoalEntry[]
  const assists = (match.assists ?? []) as unknown as AssistEntry[]
  const isCompleted = match.status === 'completed'
  const homeWon = isCompleted && match.home_score! > match.away_score!
  const awayWon = isCompleted && match.away_score! > match.home_score!

  // Group goals by team
  const homeGoals = goals.filter(g => g.team_id === home.id && !g.is_own_goal)
  const awayGoals = goals.filter(g => g.team_id === away.id && !g.is_own_goal)
  const ownGoals  = goals.filter(g => g.is_own_goal)

  // Build assist map: goal_id → assister name
  const assistMap = new Map(
    assists.map(a => [a.goal_id, a.players ? `${a.players.first_name} ${a.players.last_name}` : null])
  )

  // MVP vote tally
  const voteMap = new Map<string, number>()
  for (const v of votes ?? []) {
    const pid = (v as unknown as { player_id: string }).player_id
    voteMap.set(pid, (voteMap.get(pid) ?? 0) + 1)
  }
  const topMvpId = voteMap.size > 0
    ? [...voteMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null

  // Players eligible for MVP vote (from both teams)
  const allPlayers = [
    ...homeGoals.map(g => g.players).filter(Boolean),
    ...awayGoals.map(g => g.players).filter(Boolean),
  ]
  // Deduplicate
  const uniquePlayers = Array.from(
    new Map(allPlayers.map(p => [p!.id, p!])).values()
  )

  // All players from match (home + away) for MVP — use goals participants + assists
  const assistPlayers = assists.map(a => a.players).filter(Boolean)
  const allMatchPlayers = Array.from(
    new Map([...allPlayers, ...assistPlayers].filter(Boolean).map(p => [p!.id, p!])).values()
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">

      {/* Back */}
      <Link
        to="/matches"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={15} />
        Retour aux matchs
      </Link>

      {/* ── Score hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/80 p-6">
        <div className="absolute inset-0 bg-linear-to-br from-primary-950/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary-500/30 to-transparent" />

        {/* Matchday + date */}
        <div className="flex items-center justify-center gap-3 mb-5 text-xs text-slate-500">
          <span className="badge bg-surface-border text-slate-400">Journée {match.matchday}</span>
          {match.played_at && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(match.played_at)}
            </span>
          )}
          {!match.played_at && match.scheduled_at && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(match.scheduled_at)}
            </span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-4">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-14 h-14 rounded-2xl ring-2 ring-white/10"
              style={{ backgroundColor: home.color }}
            />
            <p className={clsx(
              'font-black text-center text-sm leading-tight',
              homeWon ? 'text-white' : 'text-slate-400'
            )}>
              {home.name}
            </p>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            {isCompleted ? (
              <div className="score-block">
                <span className={clsx('score-display text-4xl', homeWon ? 'text-primary-400' : 'text-slate-300')}>
                  {match.home_score}
                </span>
                <span className="text-slate-600 font-bold text-xl">–</span>
                <span className={clsx('score-display text-4xl', awayWon ? 'text-primary-400' : 'text-slate-300')}>
                  {match.away_score}
                </span>
              </div>
            ) : (
              <div className="px-5 py-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-slate-400 text-sm font-semibold">VS</p>
              </div>
            )}
            <span className={clsx(
              'badge mt-1',
              match.status === 'completed' ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30' :
              match.status === 'cancelled'  ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
              'bg-slate-700/60 text-slate-400 border border-slate-600/40'
            )}>
              {match.status === 'completed' ? 'Terminé' : match.status === 'cancelled' ? 'Annulé' : 'Programmé'}
            </span>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-14 h-14 rounded-2xl ring-2 ring-white/10"
              style={{ backgroundColor: away.color }}
            />
            <p className={clsx(
              'font-black text-center text-sm leading-tight',
              awayWon ? 'text-white' : 'text-slate-400'
            )}>
              {away.name}
            </p>
          </div>
        </div>

        {/* Venue */}
        {match.venue && (
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-slate-600">
            <MapPin size={11} />
            {match.venue}
          </div>
        )}
      </div>

      {/* ── Goals ── */}
      {isCompleted && goals.length > 0 && (
        <div className="card space-y-3">
          <h2 className="section-title flex items-center gap-2">
            <Trophy size={12} className="text-primary-400" />
            Buts
          </h2>

          <div className="space-y-1">
            {/* Home goals */}
            {homeGoals.map(g => (
              <div key={g.id} className="flex items-center gap-3 py-1.5">
                <div className="flex-1 flex items-center gap-2 justify-end">
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">
                      {g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'}
                    </p>
                    {assistMap.get(g.id) && (
                      <p className="text-xs text-slate-500">Passe : {assistMap.get(g.id)}</p>
                    )}
                  </div>
                  {g.minute && (
                    <span className="text-xs text-slate-600 font-mono shrink-0">{g.minute}'</span>
                  )}
                </div>
                <div className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white/10" style={{ backgroundColor: home.color }} />
                <div className="flex-1" />
              </div>
            ))}

            {/* Away goals */}
            {awayGoals.map(g => (
              <div key={g.id} className="flex items-center gap-3 py-1.5">
                <div className="flex-1" />
                <div className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white/10" style={{ backgroundColor: away.color }} />
                <div className="flex-1 flex items-center gap-2">
                  {g.minute && (
                    <span className="text-xs text-slate-600 font-mono shrink-0">{g.minute}'</span>
                  )}
                  <div>
                    <p className="text-white text-sm font-semibold">
                      {g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'}
                    </p>
                    {assistMap.get(g.id) && (
                      <p className="text-xs text-slate-500">Passe : {assistMap.get(g.id)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Own goals */}
            {ownGoals.map(g => (
              <div key={g.id} className="flex items-center justify-center gap-2 py-1.5">
                <span className="text-xs text-slate-500 italic">
                  CSC — {g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'}
                  {g.minute ? ` (${g.minute}')` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MVP Vote ── */}
      {isCompleted && allMatchPlayers.length > 0 && user && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <Star size={12} className="text-amber-400" />
              Homme du match
            </h2>
            {topMvpId && (
              <span className="text-xs text-slate-500">
                {voteMap.size} vote{voteMap.size > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {myVote ? (
            <div className="flex items-center gap-2 text-sm text-primary-400">
              <Star size={14} className="fill-primary-400" />
              Vous avez voté — vous pouvez changer votre vote
            </div>
          ) : (
            <p className="text-xs text-slate-500">Votez pour le meilleur joueur du match</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {allMatchPlayers.map(p => {
              const voteCount = voteMap.get(p.id) ?? 0
              const isMyVote = (myVote as unknown as { player_id: string } | null)?.player_id === p.id
              const isTop = p.id === topMvpId

              return (
                <button
                  key={p.id}
                  onClick={() => user && voteMvp.mutate({ matchId: id!, playerId: p.id, votedBy: user.id })}
                  disabled={voteMvp.isPending}
                  className={clsx(
                    'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                    isMyVote
                      ? 'bg-primary-600/20 border-primary-500/40 text-white'
                      : 'bg-black/20 border-white/5 text-slate-300 hover:border-primary-600/30 hover:bg-primary-600/10'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                    isMyVote ? 'bg-primary-600 text-white' : 'bg-surface-border text-slate-400'
                  )}>
                    {p.first_name[0]}{p.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.first_name} {p.last_name}</p>
                    {voteCount > 0 && (
                      <p className="text-xs text-slate-500">{voteCount} vote{voteCount > 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {isTop && voteCount > 0 && (
                    <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state for no goals */}
      {isCompleted && goals.length === 0 && (
        <div className="card">
          <div className="empty-state py-8">
            <div className="empty-state-icon"><Trophy size={20} /></div>
            <p className="text-slate-500 text-sm">Aucun buteur enregistré pour ce match.</p>
          </div>
        </div>
      )}
    </div>
  )
}
