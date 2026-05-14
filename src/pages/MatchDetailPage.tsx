import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Star, CheckCircle2, Share2 } from 'lucide-react'
import { useMatch } from '@/hooks/useMatches'
import { useMvpVotes, useMyMvpVote, useVoteMvp } from '@/hooks/useMvpVotes'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useRealtimeMatch } from '@/hooks/useRealtime'
import { useMatchEvents } from '@/hooks/useMatchLive'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SkeletonCard, SkeletonKpiGrid, SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
import { LiveBadge } from '@/components/live/LiveBadge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { LiveClock } from '@/components/live/LiveClock'
import { LiveEventFeed } from '@/components/live/LiveEventFeed'
import { LiveReactionBar } from '@/components/live/LiveReactionBar'
import { AdminLiveControls } from '@/components/live/AdminLiveControls'
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
  const { user, isAdmin } = useAuth()
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

  // Événements live
  const { data: liveEvents = [] } = useMatchEvents(id)

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="skeleton-text w-20 h-4" />
        <SkeletonMatchCard />
        <SkeletonKpiGrid count={2} />
        <SkeletonCard lines={5} />
      </div>
    )
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
  const isLive = match.status === 'live'
  const homeWon = isCompleted && match.home_score! > match.away_score!
  const awayWon = isCompleted && match.away_score! > match.home_score!

  const assistMap = new Map(
    assists.map(a => [a.goal_id, a.players ? `${a.players.first_name} ${a.players.last_name}` : null])
  )

  // Sort goals by minute
  const sortedGoals = [...goals].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

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

  // MVP
  const voteMap = new Map<string, number>()
  for (const v of votes ?? []) {
    voteMap.set(v.player_id, (voteMap.get(v.player_id) ?? 0) + 1)
  }
  const topMvpId = voteMap.size > 0
    ? [...voteMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null

  // Joueur MVP (le plus voté)
  const mvpPlayer = topMvpId
    ? allMatchPlayers.find(p => p.id === topMvpId) ?? null
    : null
  const mvpVoteCount = topMvpId ? (voteMap.get(topMvpId) ?? 0) : 0

  const totalVotes = [...voteMap.values()].reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3 pb-10">

      {/* Navigation + Share */}
      <div className="flex items-center justify-between">
        <Breadcrumbs items={[
          { label: 'Matchs', to: '/matches' },
          { label: match ? `${match.home_team.name} vs ${match.away_team.name}` : 'Détails' }
        ]} />

        {/* Bouton partage — Web Share API (iOS/Android natif) */}
        {(isCompleted || isLive) && typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={async () => {
              const home = match.home_team as TeamRef
              const away = match.away_team as TeamRef
              const score = isCompleted
                ? `${match.home_score} – ${match.away_score}`
                : '🔴 LIVE'
              try {
                await navigator.share({
                  title: `${home.name} ${score} ${away.name}`,
                  text: isCompleted
                    ? `Résultat : ${home.name} ${match.home_score} – ${match.away_score} ${away.name} · League H5`
                    : `Match en direct : ${home.name} vs ${away.name} · League H5`,
                  url: window.location.href,
                })
              } catch {
                // Annulé par l'utilisateur — pas d'erreur
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                       text-slate-400 hover:text-white border border-white/10 hover:border-white/20
                       hover:bg-white/5 transition-all"
          >
            <Share2 size={13} />
            Partager
          </button>
        )}
      </div>

      {/* ── Score header — style Sofascore ── */}
      <div className="card overflow-hidden p-0">

        {/* Bande de couleur des équipes en haut */}
        <div className="flex h-1">
          <div className="flex-1" style={{ backgroundColor: home.color }} />
          <div className="flex-1" style={{ backgroundColor: away.color }} />
        </div>

        <div className="p-4">
          {/* Meta */}
          <div className="flex items-center justify-center gap-2 mb-5 text-xs text-slate-500">
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
              <div
                className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-lg"
                style={{ backgroundColor: home.color }}
              >
                {home.logo_url
                  ? <img src={home.logo_url} alt={home.name} className="w-full h-full object-cover" />
                  : home.name[0]
                }
              </div>
              <p className={clsx(
                'text-sm font-semibold text-center leading-tight truncate w-full',
                homeWon ? 'text-white' : 'text-slate-400'
              )}>
                {home.name}
              </p>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 px-2">
              {(isCompleted || isLive) ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'text-4xl font-black tabular-nums leading-none',
                      homeWon ? 'text-white' : isLive ? 'text-white' : 'text-slate-500'
                    )}>
                      {match.home_score ?? 0}
                    </span>
                    <span className="text-slate-600 text-2xl font-light">–</span>
                    <span className={clsx(
                      'text-4xl font-black tabular-nums leading-none',
                      awayWon ? 'text-white' : isLive ? 'text-white' : 'text-slate-500'
                    )}>
                      {match.away_score ?? 0}
                    </span>
                  </div>
                  {isLive && (
                    <LiveClock
                      liveStartedAt={match.live_started_at ?? null}
                      livePeriod={match.live_period ?? null}
                      status={match.status}
                      homeColor={home.color}
                      awayColor={away.color}
                      className="w-full"
                    />
                  )}
                </div>
              ) : match.scheduled_at ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xl font-black text-white tabular-nums">
                    {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(match.scheduled_at))}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(match.scheduled_at))}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-slate-500">VS</span>
              )}
              {isLive ? (
                <LiveBadge size="md" />
              ) : (
                <span className={clsx(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                  match.status === 'completed' ? 'text-green-400 bg-green-500/10 border border-green-500/20' :
                  match.status === 'cancelled' ? 'text-red-400 bg-red-500/10 border border-red-500/20' :
                  'text-slate-500 bg-surface-raised border border-surface-border'
                )}>
                  {match.status === 'completed' ? 'Terminé' :
                   match.status === 'cancelled' ? 'Annulé' : 'À venir'}
                </span>
              )}
            </div>

            {/* Away */}
            <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div
                className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-lg"
                style={{ backgroundColor: away.color }}
              >
                {away.logo_url
                  ? <img src={away.logo_url} alt={away.name} className="w-full h-full object-cover" />
                  : away.name[0]
                }
              </div>
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

          {/* Barre de buts par équipe (si match terminé) */}
          {isCompleted && (match.home_score! + match.away_score!) > 0 && (
            <div className="mt-4 pt-3 border-t border-surface-border/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tabular-nums" style={{ color: home.color }}>
                  {match.home_score}
                </span>
                <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-surface-raised">
                  <div
                    className="h-full rounded-l-full transition-all duration-700"
                    style={{
                      width: `${(match.home_score! / (match.home_score! + match.away_score!)) * 100}%`,
                      backgroundColor: home.color,
                    }}
                  />
                  <div
                    className="h-full rounded-r-full transition-all duration-700"
                    style={{
                      width: `${(match.away_score! / (match.home_score! + match.away_score!)) * 100}%`,
                      backgroundColor: away.color,
                    }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums" style={{ color: away.color }}>
                  {match.away_score}
                </span>
              </div>
              <p className="text-center text-[10px] text-slate-600 mt-1">Buts</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Contrôles admin live ── */}
      {isAdmin && (match.status === 'scheduled' || match.status === 'live') && (
        <AdminLiveControls
          matchId={match.id}
          status={match.status}
          liveStartedAt={match.live_started_at ?? null}
          livePeriod={match.live_period ?? null}
          homeTeam={home}
          awayTeam={away}
          homeScore={match.home_score ?? 0}
          awayScore={match.away_score ?? 0}
          events={liveEvents}
          homePlayers={(homePlayers ?? []).map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name }))}
          awayPlayers={(awayPlayers ?? []).map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name }))}
        />
      )}

      {/* ── Fil d'événements live ── */}
      {isLive && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border">
            <LiveBadge size="sm" />
            <span className="text-sm font-bold text-white">Événements</span>
          </div>
          <div className="px-4 py-2">
            <LiveEventFeed
              events={liveEvents}
              homeTeamId={home.id}
              homeColor={home.color}
              awayColor={away.color}
            />
          </div>
          {/* Réactions spectateurs */}
          <div className="px-4 py-3 border-t border-surface-border/50">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Réagir</p>
            <LiveReactionBar matchId={match.id} />
          </div>
        </div>
      )}

      {/* ── Bandeau MVP du match ── */}
      {isCompleted && mvpPlayer && (
        <div
          className="relative overflow-hidden rounded-xl border border-amber-500/25 p-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)' }}
        >
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
          <div className="relative w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 ring-2 ring-amber-500/30">
            <Star size={20} className="text-amber-400 fill-amber-400/50" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest mb-0.5">
              🏆 Homme du match
            </p>
            <p className="text-lg font-black text-white truncate leading-tight">
              {mvpPlayer.first_name} {mvpPlayer.last_name}
            </p>
          </div>
          <div className="relative text-right shrink-0">
            <p className="text-3xl font-black text-amber-400 tabular-nums leading-none">{mvpVoteCount}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">vote{mvpVoteCount > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* ── Timeline buts — style Sofascore ── */}
      {isCompleted && (
        <div className="card p-0 overflow-hidden">

          {/* Column headers */}
          <div className="flex items-center border-b border-surface-border bg-surface-raised/50">
            <div className="flex-1 px-4 py-2.5 flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-black overflow-hidden shrink-0"
                style={{ backgroundColor: home.color }}>
                {home.logo_url
                  ? <img src={home.logo_url} alt="" className="w-full h-full object-cover" />
                  : home.name[0]
                }
              </div>
              <span className="text-xs font-semibold text-slate-400 truncate">{home.name}</span>
            </div>
            <div className="w-20 shrink-0 flex items-center justify-center">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Buts</span>
            </div>
            <div className="flex-1 px-4 py-2.5 flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-slate-400 truncate">{away.name}</span>
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-black overflow-hidden shrink-0"
                style={{ backgroundColor: away.color }}>
                {away.logo_url
                  ? <img src={away.logo_url} alt="" className="w-full h-full object-cover" />
                  : away.name[0]
                }
              </div>
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
