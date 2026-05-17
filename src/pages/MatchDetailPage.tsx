import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Star, CheckCircle2, Share2, UsersIcon, BarChart2 } from 'lucide-react'
import { useMatch, useMatchBySlug } from '@/hooks/useMatches'
import { useMvpVotes, useMyMvpVote, useVoteMvp } from '@/hooks/useMvpVotes'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useRealtimeMatch } from '@/hooks/useRealtime'
import { useLiveClock, useMatchEvents } from '@/hooks/useMatchLive'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SkeletonCard, SkeletonKpiGrid, SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
import { LiveBadge } from '@/components/live/LiveBadge'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { LiveClock } from '@/components/live/LiveClock'
import { LiveEventFeed } from '@/components/live/LiveEventFeed'
import { LiveTableWidget } from '@/components/live/LiveTableWidget'
import { GoalAlert } from '@/components/live/GoalAlert'
import { AdminLiveControls } from '@/components/live/AdminLiveControls'
import { LiveReactionBar } from '@/components/live/LiveReactionBar'
import { MatchLineups } from '@/components/matches/MatchLineups'
import { GoalCelebration } from '@/components/live/GoalCelebration'
import { getRouteParamType } from '@/lib/routeHelpers'
import { LiveTicker } from '@/components/live/LiveTicker'
import { useMatchLineups } from '@/hooks/useLineups'
import { useEffect, useMemo, useState, useRef } from 'react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import type { GoalWithPlayer, AssistWithPlayer, TeamRef } from '@/types/database'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Date inconnue'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '--:--'
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

// ── Match Stats Dashboard ───────────────────────────────────────────────────
function MatchStatsView({ home, away, stats }: { home: TeamRef, away: TeamRef, stats: any }) {
  const rows = [
    { label: 'Tirs Totaux', home: stats.home.shots, away: stats.away.shots },
    { label: 'Tirs Cadrés', home: stats.home.shotsOnTarget, away: stats.away.shotsOnTarget },
    { label: 'Corners', home: stats.home.corners, away: stats.away.corners },
    { label: 'Fautes', home: stats.home.fouls, away: stats.away.fouls },
  ]

  return (
    <div className="card border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
          <BarChart2 size={16} className="text-[#C8F135]" />
          Statistiques du Match
        </h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temps Réel</span>
      </div>

      <div className="space-y-6">
        {rows.map((row, i) => {
          const total = row.home + row.away
          const homePct = total === 0 ? 50 : (row.home / total) * 100
          const awayPct = total === 0 ? 50 : (row.away / total) * 100

          return (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <span className="text-lg font-black text-white tabular-nums">{row.home}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{row.label}</span>
                <span className="text-lg font-black text-white tabular-nums">{row.away}</span>
              </div>
              <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-white/5 gap-0.5">
                <div
                  className="h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--color-rgb),0.5)]"
                  style={{
                    width: `${homePct}%`,
                    backgroundColor: home.color,
                    opacity: row.home === 0 && row.away === 0 ? 0.2 : 1
                  }}
                />
                <div
                  className="h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--color-rgb),0.5)]"
                  style={{
                    width: `${awayPct}%`,
                    backgroundColor: away.color,
                    opacity: row.home === 0 && row.away === 0 ? 0.2 : 1
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
type LiveTab = 'resume' | 'events' | 'stats' | 'lineups' | 'standings'

export function MatchDetailPage() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>()
  const { data: season } = useActiveSeason()
  
  // Déterminer si c'est un ID ou un slug
  const paramType = idOrSlug ? getRouteParamType(idOrSlug) : 'id'
  
  // Utiliser le hook approprié
  const { data: matchById, isLoading: isLoadingById } = useMatch(
    paramType === 'id' ? idOrSlug : undefined
  )
  const { data: matchBySlug, isLoading: isLoadingBySlug } = useMatchBySlug(
    paramType === 'slug' ? idOrSlug : undefined,
    season?.id
  )
  
  // Sélectionner les bonnes données
  const match = paramType === 'id' ? matchById : matchBySlug
  const isLoading = paramType === 'id' ? isLoadingById : isLoadingBySlug
  const id = match?.id

  const [celebration, setCelebration] = useState<{ key: number, teamName: string, teamColor: string, playerName?: string }>({
    key: 0, teamName: '', teamColor: ''
  })
  const prevGoalsCount = useRef<number | null>(null)

  // Si le match est "à venir" (scheduled), on affiche les compositions par défaut
  const isScheduled = match?.status === 'scheduled'
  const [activeTab, setActiveTab] = useState<LiveTab>('resume')

  const { user, isAdmin, isCaptain } = useAuth()
  const { data: votes } = useMvpVotes(id)
  const { data: myVote } = useMyMvpVote(id, user?.id)
  const voteMvp = useVoteMvp()
  const { data: lineups } = useMatchLineups(id)

  // Joueurs des deux équipes — chargés dès que le match est disponible
  // (indépendamment des buts/passes pour que le vote soit toujours accessible)
  const { data: homePlayers } = usePlayersByTeam(match?.home_team_id)
  const { data: awayPlayers } = usePlayersByTeam(match?.away_team_id)

  // Abonnement Realtime — met à jour score, buts, passes et votes MVP en direct
  useRealtimeMatch(id)

  // Événements live
  const { data: liveEvents = [] } = useMatchEvents(id)

  const clock = useLiveClock(
    match?.live_started_at ?? null,
    match?.live_period as 1 | 2 | null,
    match?.status ?? 'scheduled',
    (match as any)?.halftime_at,
    match?.is_paused ?? false,
    match?.paused_at ?? null,
    match?.total_paused_seconds ?? 0
  )

  // Calcul des statistiques de match — doit être avant tout early return (règles des hooks)
  const matchStats = useMemo(() => {
    const homeId = match?.home_team_id
    const awayId = match?.away_team_id
    const stats = {
      home: { shots: 0, shotsOnTarget: 0, fouls: 0, corners: 0 },
      away: { shots: 0, shotsOnTarget: 0, fouls: 0, corners: 0 }
    }
    liveEvents.forEach(ev => {
      const side = ev.team_id === homeId ? 'home' : 'away'
      if (ev.type === 'shot') stats[side].shots++
      if (ev.type === 'shot_on_target') {
        stats[side].shotsOnTarget++
        stats[side].shots++
      }
      if (ev.type === 'goal') {
        stats[side].shotsOnTarget++
        stats[side].shots++
      }
      if (ev.type === 'foul') stats[side].fouls++
      if (ev.type === 'corner') stats[side].corners++
    })
    return stats
  }, [liveEvents, match?.home_team_id, match?.away_team_id])

  // Trigger celebration on new goals — doit être avant tout early return (règles des hooks)
  useEffect(() => {
    if (!match || match.status !== 'live') return
    const home = match.home_team as TeamRef
    const away = match.away_team as TeamRef
    const goalsOnly = liveEvents.filter(e => e.type === 'goal' || e.type === 'own_goal')
    if (prevGoalsCount.current !== null && goalsOnly.length > prevGoalsCount.current) {
      const lastGoal = goalsOnly[goalsOnly.length - 1]
      const team = lastGoal.team_id === home.id ? home : away
      setCelebration(prev => ({
        key: prev.key + 1,
        teamName: team.name,
        teamColor: team.color,
        playerName: lastGoal.player ? `${lastGoal.player.first_name} ${lastGoal.player.last_name}` : undefined
      }))
    }
    prevGoalsCount.current = goalsOnly.length
  }, [liveEvents, match])

  // Déterminer s'il y a des actions clés dans le match (buts, passes, cartons)
  const hasKeyActions = useMemo(() => {
    const hasGoals = (match?.goals ?? []).length > 0
    const hasAssists = (match?.assists ?? []).length > 0
    const hasEvents = liveEvents.some(ev =>
      ['yellow_card', 'red_card'].includes(ev.type)
    )
    return hasGoals || hasAssists || hasEvents
  }, [match?.goals, match?.assists, liveEvents])

  // Déterminer tous les joueurs du match pour le calcul global
  const allMatchPlayers = useMemo(() => {
    const goals = (match?.goals ?? []) as GoalWithPlayer[]
    const assists = (match?.assists ?? []) as AssistWithPlayer[]
    const goalPlayers = goals.flatMap(g => g.players ? [g.players] : [])
    const assistPlayers = assists.flatMap(a => a.players ? [a.players] : [])
    return Array.from(
      new Map([
        ...(homePlayers ?? []).map(p => [p.id, { id: p.id, first_name: p.first_name, last_name: p.last_name, jersey_number: p.jersey_number }] as const),
        ...(awayPlayers ?? []).map(p => [p.id, { id: p.id, first_name: p.first_name, last_name: p.last_name, jersey_number: p.jersey_number }] as const),
        ...goalPlayers.map(p => [p.id, p] as const),
        ...assistPlayers.map(p => [p.id, p] as const),
      ]).values()
    )
  }, [homePlayers, awayPlayers, match?.goals, match?.assists])

  // Filtrer les joueurs éligibles pour l'Homme du match (MVP)
  const eligibleMvpPlayers = useMemo(() => {
    const actionPlayerIds = new Set<string>()

    // 1. Ajouter les buteurs
    const goals = (match?.goals ?? []) as GoalWithPlayer[]
    goals.forEach(g => {
      if (g.player_id) actionPlayerIds.add(g.player_id)
    })

    // 2. Ajouter les passeurs
    const assists = (match?.assists ?? []) as AssistWithPlayer[]
    assists.forEach(a => {
      if (a.player_id) actionPlayerIds.add(a.player_id)
    })

    // 3. Ajouter les cartons depuis liveEvents
    liveEvents.forEach(ev => {
      if (['yellow_card', 'red_card'].includes(ev.type)) {
        if (ev.player_id) actionPlayerIds.add(ev.player_id)
        if (ev.player2_id) actionPlayerIds.add(ev.player2_id)
      }
    })

    // Si des actions clés existent, seuls ces joueurs sont éligibles
    if (actionPlayerIds.size > 0) {
      return allMatchPlayers.filter(p => actionPlayerIds.has(p.id))
    }

    // Sinon, on affiche tous les joueurs de la feuille de match (lineups)
    if (lineups && lineups.length > 0) {
      return allMatchPlayers.filter(p => lineups.some(l => l.player_id === p.id))
    }

    return allMatchPlayers
  }, [allMatchPlayers, lineups, liveEvents, match?.goals, match?.assists])

  // Droit de vote : tout le monde si actions clés, sinon uniquement les capitaines/admins
  const canVoteMvp = hasKeyActions || isCaptain

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
  const goals = match.goals as GoalWithPlayer[]
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

  // Calcul du score en direct basé sur les événements (pour éviter les désync entre Header et Timeline)
  // Pour les matchs terminés, on utilise le score officiel stocké en DB (plus fiable)
  // Pour les matchs live, on calcule depuis les events pour avoir la synchro temps réel
  const liveScore = liveEvents.reduce((acc, event) => {
    if (event.type === 'goal' || event.type === 'own_goal') {
      const isHomeGoal = event.type === 'own_goal'
        ? event.team_id !== match.home_team_id
        : event.team_id === match.home_team_id
      if (isHomeGoal) acc.home++
      else acc.away++
    }
    return acc
  }, { home: 0, away: 0 })

  const displayHomeScore = isLive ? liveScore.home : (match.home_score ?? 0)
  const displayAwayScore = isLive ? liveScore.away : (match.away_score ?? 0)

  if (isScheduled) {
    return (
      <div className="space-y-6 pb-20 px-1 animate-fade-in">
        {/* Admin Controls */}
        {isAdmin && (
          <div className="mx-1">
            <AdminLiveControls
              matchId={match.id}
              status={match.status}
              liveStartedAt={match.live_started_at}
              halftimeAt={(match as any).halftime_at}
              livePeriod={match.live_period as any}
              homeTeam={home}
              awayTeam={away}
              homeScore={displayHomeScore}
              awayScore={displayAwayScore}
              isPaused={match.is_paused ?? false}
              pausedAt={match.paused_at ?? null}
              totalPausedSeconds={match.total_paused_seconds ?? 0}
              events={liveEvents}
              homePlayers={homePlayers || []}
              awayPlayers={awayPlayers || []}
              seasonId={match.season_id}
            />
          </div>
        )}

        <Breadcrumbs items={[{ label: 'Matchs', to: '/matches' }, { label: `${home.name} vs ${away.name}` }]} />

        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl">
          <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 via-transparent to-purple-600/10" />
          <div className="relative z-10 px-6 py-12 flex flex-col items-center">
            <div className="flex items-center justify-center gap-8 sm:gap-24 w-full max-w-4xl">
              <div className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-white/5 flex items-center justify-center p-4 border border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-110">
                  {home.logo_url
                    ? <img src={home.logo_url} alt="" className="w-full h-full object-contain" />
                    : <span className="text-5xl font-black text-white">{home.name[0]}</span>
                  }
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight text-center">{home.name}</h2>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="text-2xl sm:text-4xl font-black text-white tabular-nums">
                    {formatTime(match.scheduled_at)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em] mb-1">
                    {match.scheduled_at ? formatDate(match.scheduled_at).split(' ')[0] : 'À venir'}
                  </span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{match.venue || 'Stade Municipal'}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-white/5 flex items-center justify-center p-4 border border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-110">
                  {away.logo_url
                    ? <img src={away.logo_url} alt="" className="w-full h-full object-contain" />
                    : <span className="text-5xl font-black text-white">{away.name[0]}</span>
                  }
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight text-center">{away.name}</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-900/80 backdrop-blur-xl rounded-2xl mx-1 border border-white/10 shadow-2xl sticky top-20 z-30">
          {[
            { id: 'lineups', label: 'Compositions', icon: UsersIcon },
            { id: 'standings', label: 'Classement', icon: BarChart2 },
            { id: 'stats', label: 'Détails', icon: MapPin },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                activeTab === tab.id
                  ? "bg-[#C8F135] text-black shadow-[0_0_20px_rgba(200,241,53,0.4)] scale-[1.02]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'lineups' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <MatchLineups matchId={match.id} homeTeam={home} awayTeam={away} />
            </motion.div>
          )}
          {activeTab === 'standings' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <LiveTableWidget
                seasonId={match.season_id}
                matchId={match.id}
                homeId={home.id}
                awayId={away.id}
                homeScore={match.home_score || 0}
                awayScore={match.away_score || 0}
                status={match.status}
              />
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="card text-center py-12">
                <MapPin size={32} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Infos Match</p>
                <p className="text-white text-xl font-black mt-2">{match.venue || 'Terrain principal'}</p>
                <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-widest">{formatDate(match.scheduled_at)}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const tabs = [
    { id: 'resume',    label: 'Résumé',       icon: BarChart2  },
    { id: 'events',   label: 'Événements',   icon: Calendar   },
    { id: 'stats',    label: 'Statistiques', icon: BarChart2  },
    { id: 'lineups',  label: 'Compositions', icon: UsersIcon  },
    { id: 'standings',label: 'Classement',   icon: Star       },
  ]

  return (
    <div className="space-y-6 pb-24 relative min-h-screen">
      {/* Admin Controls en Direct */}
      {isAdmin && isLive && (
        <div className="mx-1 mb-6">
          <AdminLiveControls
            matchId={match.id}
            status={match.status}
            liveStartedAt={match.live_started_at}
            halftimeAt={(match as any).halftime_at}
            livePeriod={match.live_period as any}
            homeTeam={home}
            awayTeam={away}
            homeScore={displayHomeScore}
            awayScore={displayAwayScore}
            isPaused={match.is_paused ?? false}
            pausedAt={match.paused_at ?? null}
            totalPausedSeconds={match.total_paused_seconds ?? 0}
            events={liveEvents}
            homePlayers={homePlayers || []}
            awayPlayers={awayPlayers || []}
            seasonId={match.season_id}
          />
        </div>
      )}

      {/* Alerte de but broadcast */}
      <GoalAlert
        matchId={id!}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
      />

      {/* ── Broadcast Hero Banner ── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] mx-1 sm:mx-0">

        {/* Dynamic Mesh Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -left-1/4 -top-1/4 w-3/4 h-[150%] blur-[100px] opacity-30 animate-pulse-slow"
            style={{ backgroundColor: home.color }}
          />
          <div
            className="absolute -right-1/4 -bottom-1/4 w-3/4 h-[150%] blur-[100px] opacity-30 animate-pulse-slow"
            style={{ backgroundColor: away.color }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]" />
        </div>

        {/* Header Content */}
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-6 shadow-xl">
              <span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase tracking-widest">
                {match.scheduled_at
                  ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(match.scheduled_at)).replace(',', ' •')
                  : 'Date à définir'
                }
              </span>
            </div>

            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">
                  {match.seasons?.name ?? 'Saison Live'}
                </span>
                <Breadcrumbs
                  className="text-white/20"
                  items={[
                    { label: 'Matchs', to: '/matches' },
                    { label: `${home.name} vs ${away.name}` }
                  ]}
                />
              </div>

              {/* Bouton partage */}
              {(isCompleted || isLive) && typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={async () => {
                    const score = isCompleted ? `${match.home_score} – ${match.away_score}` : '🔴 LIVE'
                    try {
                      await navigator.share({
                        title: `${home.name} ${score} ${away.name}`,
                        text: isCompleted
                          ? `Résultat : ${home.name} ${match.home_score} – ${match.away_score} ${away.name} · League H5`
                          : `Match en direct : ${home.name} vs ${away.name} · League H5`,
                        url: window.location.href,
                      })
                    } catch { }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                            text-white/40 hover:text-white border border-white/10 hover:border-white/20
                            hover:bg-white/5 transition-all backdrop-blur-md"
                >
                  <Share2 size={12} />
                  <span className="hidden sm:inline">Partager</span>
                </button>
              )}
            </div>
          </div>

          {/* Teams & Scoreboard — Premium Boxed Format */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-2xl mb-6">
              {/* Team Home */}
              <div className="flex-1 flex flex-col items-center gap-2 sm:gap-3">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[2rem] bg-white/5 flex items-center justify-center p-2.5 sm:p-3 shadow-2xl border border-white/10 ring-1 ring-white/5 transition-transform hover:scale-105">
                  {home.logo_url
                    ? <img src={home.logo_url} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                    : <span className="text-3xl sm:text-4xl font-black text-white">{home.name[0]}</span>
                  }
                </div>
                <span className="text-[10px] sm:text-sm font-black text-white uppercase tracking-wider text-center">{home.name}</span>
              </div>

              {/* Center Score — Boxed Style */}
              <div className="flex flex-col items-center px-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Box Home */}
                  <div className={clsx(
                    "w-12 h-14 sm:w-20 sm:h-24 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all duration-500",
                    displayHomeScore > displayAwayScore
                      ? "bg-blue-600 border-blue-400/30 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                      : "bg-white/5 border-white/10 shadow-2xl"
                  )}>
                    <span className="text-3xl sm:text-7xl font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {(isLive || isCompleted) ? displayHomeScore : ''}
                    </span>
                  </div>

                  <span className="text-xl sm:text-2xl font-black text-white/20 italic">—</span>

                  {/* Box Away */}
                  <div className={clsx(
                    "w-12 h-14 sm:w-20 sm:h-24 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all duration-500",
                    displayAwayScore > displayHomeScore
                      ? "bg-blue-600 border-blue-400/30 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                      : "bg-white/5 border-white/10 shadow-2xl"
                  )}>
                    <span className="text-3xl sm:text-7xl font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {(isLive || isCompleted) ? displayAwayScore : ''}
                    </span>
                  </div>
                </div>

                {/* Match Status Badge — Chrono */}
                <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-xs">
                  {isLive && clock.phase === 2 ? (
                    /* ── Pause mi-temps ── */
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em]">
                        Mi-temps
                      </span>
                      <div className="px-4 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                        <span className="text-sm font-black text-blue-300 tabular-nums tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          HT {displayHomeScore}-{displayAwayScore}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-blue-400/60 tabular-nums">
                        Pause {Math.floor((clock.breakSecondsLeft ?? 0) / 60)}:{String(Math.floor((clock.breakSecondsLeft ?? 0) % 60)).padStart(2, '0')}
                      </span>
                    </div>
                  ) : isLive ? (
                    /* ── Match en cours ── */
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <span className={clsx(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          clock.isPaused ? "bg-amber-500" : "bg-red-500 animate-pulse"
                        )} />
                        <span className="text-sm font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {clock.label}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          {clock.isPaused ? 'Suspendu' : clock.phase === 3 ? '2ème MT' : '1ère MT'}
                        </span>
                      </div>
                      {/* Barre de progression */}
                      <LiveClock
                        liveStartedAt={match.live_started_at}
                        livePeriod={match.live_period as 1 | 2 | null}
                        halftimeAt={(match as any).halftime_at}
                        isPaused={match.is_paused ?? false}
                        pausedAt={match.paused_at ?? null}
                        totalPausedSeconds={match.total_paused_seconds ?? 0}
                        status={match.status}
                        homeColor={home.color}
                        awayColor={away.color}
                        className="w-full"
                      />
                    </div>
                  ) : isCompleted ? (
                    <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Match Terminé</span>
                    </div>
                  ) : (
                    <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">À venir</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Team Away */}
              <div className="flex-1 flex flex-col items-center gap-2 sm:gap-3">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[2rem] bg-white/5 flex items-center justify-center p-2.5 sm:p-3 shadow-2xl border border-white/10 ring-1 ring-white/5 transition-transform hover:scale-105">
                  {away.logo_url
                    ? <img src={away.logo_url} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                    : <span className="text-3xl sm:text-4xl font-black text-white">{away.name[0]}</span>
                  }
                </div>
                <span className="text-[10px] sm:text-sm font-black text-white uppercase tracking-wider text-center">{away.name}</span>
              </div>
            </div>

            {/* Scorers List — Professional Format */}
            {(isLive || isCompleted) && (goals.length > 0) && (
              <div className="flex w-full max-w-2xl mt-4 px-6 items-start">
                {/* Home Scorers */}
                <div className="flex-1 flex flex-col items-end text-right space-y-1">
                  {goals.filter(g => g.team_id === home.id).map(g => (
                    <div key={g.id} className="group cursor-default">
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">
                        {g.players?.last_name} <span className="text-slate-600 ml-1">{g.minute}'</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Center Icon Separator */}
                <div className="px-6 py-1">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                    <span className="text-[10px] opacity-60">⚽</span>
                  </div>
                </div>

                {/* Away Scorers */}
                <div className="flex-1 flex flex-col items-start text-left space-y-1">
                  {goals.filter(g => g.team_id === away.id).map(g => (
                    <div key={g.id} className="group cursor-default">
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">
                        {g.players?.last_name} <span className="text-slate-600 ml-1">{g.minute}'</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation — style Sofascore/Google ── */}
      <div className="sticky top-[60px] z-30 bg-[#0f1420]/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LiveTab)}
              className={clsx(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-200 border-b-2 whitespace-nowrap",
                activeTab === tab.id
                  ? "border-[#C8F135] text-[#C8F135]"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:border-white/20"
              )}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">

        {/* ── Résumé ── */}
        {activeTab === 'resume' && (
          <motion.div
            key="resume"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* MVP banner */}
            {isCompleted && mvpPlayer && (
              <div
                className="relative overflow-hidden rounded-xl border border-amber-500/25 p-4 flex items-center gap-4 mx-2"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)' }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
                <div className="relative w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 ring-2 ring-amber-500/30">
                  <Star size={20} className="text-amber-400 fill-amber-400/50" />
                </div>
                <div className="relative flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest mb-0.5">
                    🏆 Homme du match
                  </p>
                  <p className="text-base sm:text-lg font-black text-white truncate leading-tight">
                    {mvpPlayer.first_name} {mvpPlayer.last_name}
                  </p>
                </div>
                <div className="relative text-right shrink-0">
                  <p className="text-3xl font-black text-amber-400 tabular-nums leading-none">{mvpVoteCount}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">vote{mvpVoteCount > 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            {/* Goals timeline (if completed) */}
            {isCompleted && (
              <div className="card p-0 overflow-hidden mx-2">
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

            {/* MVP Vote */}
            {isCompleted && eligibleMvpPlayers.length > 0 && user && (
              <div className="card space-y-4 mx-2">
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
                {voteMvp.isPending && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                    <LoadingSpinner size="sm" />
                    Enregistrement du vote…
                  </div>
                )}
                {!canVoteMvp && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center mx-1">
                    <p className="text-[11.5px] font-bold text-amber-400">
                      ⚠️ Match sans action clé
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Seuls les capitaines d'équipe et administrateurs sont habilités à élire le MVP pour cette rencontre sans événement.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {eligibleMvpPlayers.map(p => {
                    const voteCount = voteMap.get(p.id) ?? 0
                    const isMyVote = myVote?.player_id === p.id
                    const isTop = p.id === topMvpId && voteCount > 0
                    const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (!canVoteMvp) return
                          voteMvp.mutate({ matchId: id!, playerId: p.id, votedBy: user.id })
                        }}
                        disabled={voteMvp.isPending || !canVoteMvp}
                        className={clsx(
                          'relative flex items-center gap-2.5 p-3 rounded-xl border text-left',
                          'transition-all duration-200 overflow-hidden',
                          isMyVote
                            ? 'border-amber-500/50 bg-amber-500/10'
                            : 'border-surface-border bg-surface-raised hover:border-amber-500/30 hover:bg-amber-500/5',
                          (voteMvp.isPending || !canVoteMvp) && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        {pct > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isMyVote ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                            }}
                          />
                        )}
                        <div className={clsx(
                          'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
                          'text-xs font-bold shrink-0 transition-all duration-200',
                          isMyVote ? 'bg-amber-500 text-black' : 'bg-surface-muted text-slate-400'
                        )}>
                          {p.first_name[0]}{p.last_name[0]}
                          {isMyVote && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border border-surface-raised flex items-center justify-center">
                              <CheckCircle2 size={8} className="text-white" />
                            </span>
                          )}
                        </div>
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
                        {isTop && (
                          <Star size={13} className="relative z-10 text-amber-400 fill-amber-400 shrink-0 animate-score-pop" />
                        )}
                      </button>
                    )
                  })}
                </div>
                {canVoteMvp ? (
                  <p className="text-[10px] text-slate-600 text-center">
                    Clique sur un joueur pour voter · Tu peux changer ton vote
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-500/60 text-center font-bold">
                    🛡️ Vote restreint aux capitaines et administrateurs
                  </p>
                )}
              </div>
            )}

            {/* Venue info card */}
            <div className="card mx-2">
              {match.venue && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-surface-raised py-2 rounded-lg border border-surface-border">
                  <MapPin size={12} className="text-[#FFDF73]" />
                  {match.venue}
                </div>
              )}
              {match.scheduled_at && (
                <p className="text-center text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">
                  {formatDate(match.scheduled_at)}
                </p>
              )}
            </div>

            {/* LiveReactionBar */}
            {isLive && (
              <div className="card mx-2">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Réagir</p>
                <LiveReactionBar matchId={match.id} />
              </div>
            )}
          </motion.div>
        )}

        {/* ── Événements ── */}
        {activeTab === 'events' && (
          <motion.div
            key="events"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {(isLive || isCompleted) && liveEvents.length > 0 ? (
              <div className="card p-0 overflow-hidden mx-2">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border">
                  {isLive && <LiveBadge size="sm" />}
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
              </div>
            ) : (
              <div className="card text-center py-12 mx-2">
                <Calendar size={32} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucun événement</p>
                <p className="text-slate-600 text-[10px] mt-1">Les événements apparaîtront ici en direct</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Statistiques ── */}
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="mx-2">
              <MatchStatsView
                home={home}
                away={away}
                stats={matchStats}
              />
            </div>

            {/* Goals possession bar (if completed) */}
            {isCompleted && (match.home_score! + match.away_score!) > 0 && (
              <div className="card mx-2">
                <p className="text-center text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1.5">Possession (Buts)</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tabular-nums drop-shadow-md" style={{ color: home.color }}>
                    {match.home_score}
                  </span>
                  <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-black/50 border border-white/5 ring-1 ring-black shadow-inner">
                    <div
                      className="h-full rounded-l-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${(match.home_score! / (match.home_score! + match.away_score!)) * 100}%`,
                        background: `linear-gradient(90deg, ${home.color}40, ${home.color})`,
                        boxShadow: `0 0 10px ${home.color}80`
                      }}
                    />
                    <div
                      className="h-full rounded-r-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${(match.away_score! / (match.home_score! + match.away_score!)) * 100}%`,
                        background: `linear-gradient(-90deg, ${away.color}40, ${away.color})`,
                        boxShadow: `0 0 10px ${away.color}80`
                      }}
                    />
                  </div>
                  <span className="text-sm font-black tabular-nums drop-shadow-md" style={{ color: away.color }}>
                    {match.away_score}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Compositions ── */}
        {activeTab === 'lineups' && (
          <motion.div
            key="lineups"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-2"
          >
            <MatchLineups
              matchId={id!}
              homeTeam={home}
              awayTeam={away}
              scheduledAt={match?.scheduled_at}
            />
          </motion.div>
        )}

        {/* ── Classement ── */}
        {activeTab === 'standings' && (
          <motion.div
            key="standings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-2"
          >
            <LiveTableWidget
              seasonId={match.season_id}
              matchId={id!}
              homeId={home.id}
              awayId={away.id}
              homeScore={displayHomeScore}
              awayScore={displayAwayScore}
              status={match.status}
            />
          </motion.div>
        )}

      </AnimatePresence>

      <GoalCelebration
        key={celebration.key}
        teamName={celebration.teamName}
        teamColor={celebration.teamColor}
        playerName={celebration.playerName}
      />
      <LiveTicker />
    </div>
  )
}
