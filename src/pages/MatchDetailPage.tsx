import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Star, CheckCircle2 } from 'lucide-react'
import { useMatch } from '@/hooks/useMatches'
import { useMvpVotes, useMyMvpVote, useVoteMvp } from '@/hooks/useMvpVotes'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useRealtimeMatch } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { GoalWithPlayer, AssistWithPlayer, TeamRef } from '@/types/database'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Date inconnue'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

// ── Timeline event — style Sofascore ─────────────────────────────────────────
function GoalEvent({
  side,
  playerName,
  assistName,
  minute,
  isOwnGoal,
  teamColor,
}: {
  side: 'home' | 'away' | 'own'
  playerName: string
  assistName?: string | null
  minute?: number | null
  isOwnGoal?: boolean
  teamColor: string
}) {
  if (side === 'own') {
    return (
      <div className="flex items-center justify-center gap-3 py-2.5 border-b border-surface-border/40 last:border-b-0">
        <span className="text-xs text-slate-600 font-mono w-8 text-right shrink-0">
          {minute ? `${minute}'` : ''}
        </span>
        <span className="text-base">⚽</span>
        <span className="text-xs text-slate-500 italic">
          CSC — {playerName}
        </span>
      </div>
    )
  }

  const isHome = side === 'home'

  return (
    <div className={clsx(
      'flex items-start gap-0 py-2.5 border-b border-surface-border/40 last:border-b-0',
    )}>
      {/* Home side */}
      <div className={clsx('flex-1 flex items-start', isHome ? 'justify-end pr-2' : '')}>
        {isHome && (
          <div className="text-right">
            <p className="text-sm font-semibold text-white leading-tight">{playerName}</p>
            {assistName && (
              <p className="text-xs text-slate-500 mt-0.5">
                Passe déc. <span className="text-slate-400">{assistName}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Center — icon + minute */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-16">
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ backgroundColor: teamColor }}
          />
          <span className="text-sm leading-none">⚽</span>
        </div>
        {minute && (
          <span className="text-[10px] text-slate-600 font-mono">{minute}'</span>
        )}
      </div>

      {/* Away side */}
      <div className={clsx('flex-1 flex items-start', !isHome ? 'pl-2' : 'justify-end')}>
        {!isHome && (
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{playerName}</p>
            {assistName && (
              <p className="text-xs text-slate-500 mt-0.5">
                Passe déc. <span className="text-slate-400">{assistName}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: match, isLoading } = useMatch(id)
  const { data: votes } = useMvpVotes(id)
  const { data: myVote } = useMyMvpVote(id, user?.id)
  const voteMvp = useVoteMvp()

  // Joueurs des deux équipes — chargés dès que le match est disponible
  // (indépendamment des buts/passes pour que le vote soit toujours accessible)
  const { data: homePlayers } = usePlayersByTeam(match?.home_team_id)
  const { data: awayPlayers } = usePlayersByTeam(match?.away_team_id)

  // Abonnement Realtime — met à jour score, buts, passes et votes MVP en direct
  useRealtimeMatch(id)

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
  }

  if (!match) {
    return (
      <div className="card text-center py-16">
        <p className="text-slate-400">Match introuvable.</p>
        <Link to="/matches" className="btn-secondary mt-4 inline-flex">← Retour</Link>
      </div>
    )
  }

  const home = match.home_team as TeamRef
  const away = match.away_team as TeamRef
  const goals   = match.goals   as GoalWithPlayer[]
  const assists = match.assists as AssistWithPlayer[]
  const isCompleted = match.status === 'completed'
  const homeWon = isCompleted && match.home_score! > match.away_score!
  const awayWon = isCompleted && match.away_score! > match.home_score!

  const assistMap = new Map(
    assists.map(a => [a.goal_id, a.players ? `${a.players.first_name} ${a.players.last_name}` : null])
  )

  // Sort goals by minute
  const sortedGoals = [...goals].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

  // MVP
  const voteMap = new Map<string, number>()
  for (const v of votes ?? []) {
    voteMap.set(v.player_id, (voteMap.get(v.player_id) ?? 0) + 1)
  }
  const topMvpId = voteMap.size > 0
    ? [...voteMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null

  const goalPlayers = goals.flatMap(g => g.players ? [g.players] : [])
  const assistPlayers = assists.flatMap(a => a.players ? [a.players] : [])
  // Priorité aux joueurs qui ont marqué/passé, complété par tous les joueurs des équipes
  const allMatchPlayers = Array.from(
    new Map([
      ...(homePlayers ?? []).map(p => [p.id, { id: p.id, first_name: p.first_name, last_name: p.last_name, jersey_number: p.jersey_number }] as const),
      ...(awayPlayers ?? []).map(p => [p.id, { id: p.id, first_name: p.first_name, last_name: p.last_name, jersey_number: p.jersey_number }] as const),
      ...goalPlayers.map(p => [p.id, p] as const),
      ...assistPlayers.map(p => [p.id, p] as const),
    ]).values()
  )

  const totalVotes = [...voteMap.values()].reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3 pb-10">

      {/* Back */}
      <Link to="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={14} />
        Matchs
      </Link>

      {/* ── Score header — style Sofascore ── */}
      <div className="card">

        {/* Meta */}
        <div className="flex items-center justify-center gap-2 mb-4 text-xs text-slate-500">
          <span className="badge bg-surface-raised text-slate-500 border border-surface-border">
            Journée {match.matchday}
          </span>
          {(match.played_at || match.scheduled_at) && (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatDate(match.played_at ?? match.scheduled_at)}
            </span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-2">

          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div className="w-12 h-12 rounded-lg shrink-0"
              style={{ backgroundColor: home.color }} />
            <p className={clsx(
              'text-sm font-semibold text-center leading-tight truncate w-full',
              homeWon ? 'text-white' : 'text-slate-400'
            )}>
              {home.name}
            </p>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 px-2">
            {isCompleted ? (
              <div className="flex items-center gap-3">
                <span className={clsx(
                  'text-4xl font-bold tabular-nums',
                  homeWon ? 'text-white' : 'text-slate-500'
                )}>
                  {match.home_score}
                </span>
                <span className="text-slate-600 text-xl font-light">-</span>
                <span className={clsx(
                  'text-4xl font-bold tabular-nums',
                  awayWon ? 'text-white' : 'text-slate-500'
                )}>
                  {match.away_score}
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-slate-500">VS</span>
            )}
            <span className={clsx(
              'text-[10px] font-bold uppercase tracking-wider',
              match.status === 'completed' ? 'text-primary-500' :
              match.status === 'cancelled'  ? 'text-red-500' : 'text-slate-600'
            )}>
              {match.status === 'completed' ? 'Terminé' :
               match.status === 'cancelled' ? 'Annulé' : 'Programmé'}
            </span>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div className="w-12 h-12 rounded-lg shrink-0"
              style={{ backgroundColor: away.color }} />
            <p className={clsx(
              'text-sm font-semibold text-center leading-tight truncate w-full',
              awayWon ? 'text-white' : 'text-slate-400'
            )}>
              {away.name}
            </p>
          </div>
        </div>

        {/* Venue */}
        {match.venue && (
          <div className="flex items-center justify-center gap-1 mt-3 text-xs text-slate-600">
            <MapPin size={10} />
            {match.venue}
          </div>
        )}
      </div>

      {/* ── Timeline buts — style Sofascore ── */}
      {isCompleted && (
        <div className="card p-0 overflow-hidden">

          {/* Column headers */}
          <div className="flex items-center border-b border-surface-border">
            <div className="flex-1 px-4 py-2 text-center">
              <span className="text-xs font-semibold text-slate-400">{home.name}</span>
            </div>
            <div className="w-20 shrink-0" />
            <div className="flex-1 px-4 py-2 text-center">
              <span className="text-xs font-semibold text-slate-400">{away.name}</span>
            </div>
          </div>

          {goals.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600">Aucun buteur enregistré</p>
            </div>
          ) : (
            <div className="px-4">
              {sortedGoals.map(g => {
                const playerName = g.players
                  ? `${g.players.first_name} ${g.players.last_name}`
                  : '—'
                const assistName = assistMap.get(g.id) ?? null

                if (g.is_own_goal) {
                  return (
                    <GoalEvent
                      key={g.id}
                      side="own"
                      playerName={playerName}
                      minute={g.minute}
                      teamColor={g.team_id === home.id ? home.color : away.color}
                    />
                  )
                }

                return (
                  <GoalEvent
                    key={g.id}
                    side={g.team_id === home.id ? 'home' : 'away'}
                    playerName={playerName}
                    assistName={assistName}
                    minute={g.minute}
                    teamColor={g.team_id === home.id ? home.color : away.color}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MVP Vote ── */}
      {isCompleted && allMatchPlayers.length > 0 && user && (
        <div className="card space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400/30" />
              <span className="text-sm font-bold text-white">Homme du match</span>
            </div>
            <div className="flex items-center gap-2">
              {totalVotes > 0 && (
                <span className="text-xs text-slate-500">
                  {totalVotes} vote{totalVotes > 1 ? 's' : ''}
                </span>
              )}
              {myVote && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                  <CheckCircle2 size={13} className="fill-green-400/20" />
                  Voté
                </span>
              )}
            </div>
          </div>

          {/* Feedback vote en attente */}
          {voteMvp.isPending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
              <LoadingSpinner size="sm" />
              Enregistrement du vote…
            </div>
          )}

          {/* Grille joueurs */}
          <div className="grid grid-cols-2 gap-2">
            {allMatchPlayers.map(p => {
              const voteCount = voteMap.get(p.id) ?? 0
              const isMyVote  = myVote?.player_id === p.id
              const isTop     = p.id === topMvpId && voteCount > 0
              const pct       = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

              return (
                <button
                  key={p.id}
                  onClick={() => voteMvp.mutate({ matchId: id!, playerId: p.id, votedBy: user.id })}
                  disabled={voteMvp.isPending}
                  className={clsx(
                    'relative flex items-center gap-2.5 p-3 rounded-xl border text-left',
                    'transition-all duration-200 overflow-hidden',
                    isMyVote
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-surface-border bg-surface-raised hover:border-amber-500/30 hover:bg-amber-500/5',
                    voteMvp.isPending && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {/* Barre de progression en fond */}
                  {pct > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isMyVote
                          ? 'rgba(245,158,11,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      }}
                    />
                  )}

                  {/* Avatar */}
                  <div className={clsx(
                    'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
                    'text-xs font-bold shrink-0 transition-all duration-200',
                    isMyVote
                      ? 'bg-amber-500 text-black'
                      : 'bg-surface-muted text-slate-400'
                  )}>
                    {p.first_name[0]}{p.last_name[0]}
                    {isMyVote && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full
                                       bg-green-500 border border-surface-raised
                                       flex items-center justify-center">
                        <CheckCircle2 size={8} className="text-white" />
                      </span>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="relative z-10 min-w-0 flex-1">
                    <p className={clsx(
                      'text-xs font-semibold truncate transition-colors',
                      isMyVote ? 'text-amber-300' : 'text-slate-200'
                    )}>
                      {p.first_name} {p.last_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {voteCount > 0 ? (
                        <span className="text-[10px] text-slate-500">
                          {voteCount} vote{voteCount > 1 ? 's' : ''} · {pct}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600">Aucun vote</span>
                      )}
                    </div>
                  </div>

                  {/* Étoile top */}
                  {isTop && (
                    <Star
                      size={13}
                      className="relative z-10 text-amber-400 fill-amber-400 shrink-0 animate-score-pop"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Légende */}
          <p className="text-[10px] text-slate-600 text-center">
            Clique sur un joueur pour voter · Tu peux changer ton vote
          </p>
        </div>
      )}
    </div>
  )
}
