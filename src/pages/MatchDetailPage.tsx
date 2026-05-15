import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Star, CheckCircle2, Share2, UsersIcon, BarChart2 } from 'lucide-react'
import { useMatch } from '@/hooks/useMatches'
import { useMvpVotes, useMyMvpVote, useVoteMvp } from '@/hooks/useMvpVotes'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useRealtimeMatch } from '@/hooks/useRealtime'
import { useLiveClock, useMatchEvents } from '@/hooks/useMatchLive'
import { useAuth } from '@/hooks/useAuth'
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
import { useState } from 'react'
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
  const { data: match, isLoading } = useMatch(id)
  
  // Si le match est "à venir" (scheduled), on affiche les compositions par défaut
  const isScheduled = match?.status === 'scheduled'
  const [activeTab, setActiveTab] = useState<'stats' | 'lineups' | 'standings'>('lineups')
  
  const { user, isAdmin } = useAuth()
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

  const clock = useLiveClock(
    match?.live_started_at ?? null,
    match?.live_period as 1 | 2 | null,
    match?.status ?? 'scheduled',
    (match as any)?.halftime_at
  )

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

  // Calcul du score en direct basé sur les événements (pour éviter les désync entre Header et Timeline)
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

  const displayHomeScore = (isLive || isCompleted) ? liveScore.home : (match.home_score ?? 0)
  const displayAwayScore = (isLive || isCompleted) ? liveScore.away : (match.away_score ?? 0)



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
               events={liveEvents}
               homePlayers={homePlayers || []}
               awayPlayers={awayPlayers || []}
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
             events={liveEvents}
             homePlayers={homePlayers || []}
             awayPlayers={awayPlayers || []}
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
                  Partager
                </button>
              )}
            </div>
          </div>

          {/* Teams & Scoreboard — Premium Boxed Format */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-2xl mb-6">
              {/* Team Home */}
              <div className="flex-1 flex flex-col items-center gap-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-white/5 flex items-center justify-center p-3 shadow-2xl border border-white/10 ring-1 ring-white/5 transition-transform hover:scale-105">
                  {home.logo_url
                    ? <img src={home.logo_url} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                    : <span className="text-4xl font-black text-white">{home.name[0]}</span>
                  }
                </div>
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">{home.name}</span>
              </div>

              {/* Center Score — Boxed Style */}
              <div className="flex flex-col items-center px-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Box Home */}
                  <div className={clsx(
                    "w-14 h-16 sm:w-20 sm:h-24 rounded-2xl border flex items-center justify-center transition-all duration-500",
                    displayHomeScore > displayAwayScore
                      ? "bg-blue-600 border-blue-400/30 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                      : "bg-white/5 border-white/10 shadow-2xl"
                  )}>
                    <span className="text-4xl sm:text-7xl font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {(isLive || isCompleted) ? displayHomeScore : ''}
                    </span>
                  </div>

                  <span className="text-2xl font-black text-white/20 italic">—</span>

                  {/* Box Away */}
                  <div className={clsx(
                    "w-14 h-16 sm:w-20 sm:h-24 rounded-2xl border flex items-center justify-center transition-all duration-500",
                    displayAwayScore > displayHomeScore
                      ? "bg-blue-600 border-blue-400/30 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                      : "bg-white/5 border-white/10 shadow-2xl"
                  )}>
                    <span className="text-4xl sm:text-7xl font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {(isLive || isCompleted) ? displayAwayScore : ''}
                    </span>
                  </div>
                </div>

                {/* Match Status Badge */}
                <div className="mt-4 px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    {isLive ? clock.label : isCompleted ? 'Match Terminé' : 'À venir'}
                  </span>
                </div>
              </div>

              {/* Team Away */}
              <div className="flex-1 flex flex-col items-center gap-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-white/5 flex items-center justify-center p-3 shadow-2xl border border-white/10 ring-1 ring-white/5 transition-transform hover:scale-105">
                  {away.logo_url
                    ? <img src={away.logo_url} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                    : <span className="text-4xl font-black text-white">{away.name[0]}</span>
                  }
                </div>
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">{away.name}</span>
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

      {/* Tabs Navigation — High Visibility Style */}
      <div className="flex gap-2 p-1.5 bg-slate-900/80 backdrop-blur-xl rounded-2xl mx-3 border border-white/10 shadow-2xl sticky top-20 z-30">
        <button
          onClick={() => setActiveTab('stats')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
            activeTab === 'stats'
              ? "bg-[#C8F135] text-black shadow-[0_0_20px_rgba(200,241,53,0.4)] scale-[1.02]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <BarChart2 size={14} />
          Résumé
        </button>
        <button
          onClick={() => setActiveTab('lineups')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
            activeTab === 'lineups'
              ? "bg-[#C8F135] text-black shadow-[0_0_20px_rgba(200,241,53,0.4)] scale-[1.02]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <UsersIcon size={14} />
          Compos
        </button>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-6 animate-fade-in">


          {/* Venue & Stats globales */}
          <div className="card mx-2">
            {/* Venue */}
            {match.venue && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-surface-raised py-2 rounded-lg border border-surface-border">
                <MapPin size={12} className="text-[#FFDF73]" />
                {match.venue}
              </div>
            )}

            {/* Barre de buts par équipe (si match terminé) */}
            {isCompleted && (match.home_score! + match.away_score!) > 0 && (
              <div className="mt-3">
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
          </div>

          {/* ── Contrôles admin live ── */}
          {isAdmin && (match.status === 'scheduled' || match.status === 'live') && (
            <AdminLiveControls
              matchId={match.id}
              status={match.status}
              liveStartedAt={match.live_started_at ?? null}
              halftimeAt={(match as { halftime_at?: string | null }).halftime_at ?? null}
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

                {/* ── Virtual Standing ── */}
                {match.status === 'live' && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <LiveTableWidget
                      seasonId={match.season_id}
                      matchId={id!}
                      homeId={match.home_team_id}
                      awayId={match.away_team_id}
                      homeScore={match.home_score ?? 0}
                      awayScore={match.away_score ?? 0}
                      status={match.status}
                    />
                  </div>
                )}
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
                  const isMyVote = myVote?.player_id === p.id
                  const isTop = p.id === topMvpId && voteCount > 0
                  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

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
      ) : (
        <div className="mx-2 animate-fade-in">
          <MatchLineups
            matchId={id!}
            homeTeam={home}
            awayTeam={away}
            scheduledAt={match?.scheduled_at}
          />
        </div>
      )}
    </div>
  )
}
