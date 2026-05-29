import { useState, useEffect, useMemo } from 'react'
import {
  Calendar, Trophy, Target, Users, ArrowRight, TrendingUp, Flame,
  Radio, Clock, CheckCircle2, AlertCircle, ChevronRight,
  Crown, Settings, Zap, Star, BarChart2, Shield,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { useMyTeam } from '@/hooks/useMyTeam'
import { useMatchLineups } from '@/hooks/useLineups'
import { useCountUp } from '@/hooks/useCountUp'
import { useAuth } from '@/hooks/useAuth'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { usePlayerDiscipline } from '@/hooks/useDisciplinaryStats'
import { useSpectators } from '@/hooks/useSpectators'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonKpiGrid, SkeletonCard, SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
import { LiveBadge } from '@/components/live/LiveBadge'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import { useLiveClock } from '@/hooks/useMatchLive'
import { clsx } from 'clsx'

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

// ── Statut composition pour un match ─────────────────────────────────────────
function LineupStatusBadge({ matchId, teamId, isCaptain }: {
  matchId: string; teamId: string; isCaptain: boolean
}) {
  const { data: lineups, isLoading } = useMatchLineups(matchId)
  const hasLineup = useMemo(() => {
    if (!lineups) return false
    return lineups.some(l => l.team_id === teamId && l.is_starter)
  }, [lineups, teamId])

  if (isLoading) return null
  if (hasLineup) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
        <CheckCircle2 size={11} className="text-green-400 shrink-0" />
        <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Compo soumise</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertCircle size={11} className="text-amber-400 shrink-0" />
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Compo manquante</span>
      </div>
      {isCaptain && (
        <Link to="/captain" onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-500/15 border border-primary-500/30 text-[10px] font-black text-primary-400 hover:bg-primary-500/25 transition-colors uppercase tracking-wider">
          Soumettre <ChevronRight size={10} />
        </Link>
      )}
    </div>
  )
}

// ── Compte à rebours ──────────────────────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const [diff, setDiff] = useState<number | null>(null)
  useEffect(() => {
    if (!targetDate) return
    const tick = () => setDiff(new Date(targetDate).getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  if (diff === null || diff <= 0) return null
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  if (h > 48) return null
  return { h, m, s }
}

function NextMatchCountdown({ match, teamId, isCaptain }: {
  match: MatchWithTeams; teamId?: string | null; isCaptain?: boolean
}) {
  const countdown = useCountdown(match.scheduled_at)
  const isImminent = countdown ? countdown.h === 0 && countdown.m < 30 : false
  return (
    <div className={clsx('mx-4 mb-3 rounded-xl border overflow-hidden',
      isImminent ? 'border-red-500/30' : 'border-primary-500/20')}>
      {countdown && (
        <div className={clsx('flex items-center justify-center gap-3 px-4 py-2.5',
          isImminent ? 'bg-red-500/8' : 'bg-primary-500/5')}>
          <Clock size={13} className={isImminent ? 'text-red-400' : 'text-primary-400'} />
          <span className={clsx('text-[10px] font-black uppercase tracking-widest',
            isImminent ? 'text-red-300' : 'text-primary-300')}>
            Prochain match dans
          </span>
          <div className={clsx('flex items-center gap-1 font-black tabular-nums', isImminent && 'animate-pulse')}>
            {countdown.h > 0 && (<>
              <span className={clsx('text-lg', isImminent ? 'text-red-400' : 'text-text-primary')}>{String(countdown.h).padStart(2, '0')}</span>
              <span className="text-text-muted text-sm">h</span>
            </>)}
            <span className={clsx('text-lg', isImminent ? 'text-red-400' : 'text-text-primary')}>{String(countdown.m).padStart(2, '0')}</span>
            <span className="text-text-muted text-sm">m</span>
            <span className={clsx('text-lg', isImminent ? 'text-red-400' : 'text-text-primary')}>{String(countdown.s).padStart(2, '0')}</span>
            <span className="text-text-muted text-sm">s</span>
          </div>
        </div>
      )}
      {teamId && (
        <div className={clsx('flex items-center justify-between gap-2 px-4 py-2 border-t',
          isImminent ? 'border-red-500/15 bg-red-500/4' : 'border-primary-500/10 bg-black/20')}>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Composition</span>
          <LineupStatusBadge matchId={match.id} teamId={teamId} isCaptain={!!isCaptain} />
        </div>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, trend }: {
  label: string; value: number; icon: typeof Calendar; color: string; trend?: string
}) {
  const animatedValue = useCountUp(value)
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 group transition-all duration-500 hover:-translate-y-1.5 glass-morphism">
      <div className="absolute -top-10 -right-10 w-24 h-24 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none"
        style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-green-400/20">
            <TrendingUp size={9} /> {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-black tabular-nums leading-none tracking-tight text-text-primary drop-shadow-sm">{animatedValue}</p>
      <p className="text-[11px] mt-2 font-bold uppercase tracking-wider text-text-muted group-hover:text-text-secondary transition-colors">{label}</p>
      <div className="absolute inset-0 border border-transparent group-hover:border-black/5 dark:group-hover:border-white/10 rounded-2xl transition-all duration-500" />
    </div>
  )
}

// ── Mini match card ───────────────────────────────────────────────────────────
function MiniMatchCard({ match, variant, myTeamId }: {
  match: MatchWithTeams; variant: 'upcoming' | 'result'; myTeamId?: string | null
}) {
  const homeWon = match.home_score! > match.away_score!
  const awayWon = match.away_score! > match.home_score!
  const isMyMatch = myTeamId && (match.home_team_id === myTeamId || match.away_team_id === myTeamId)

  return (
    <Link to={`/matches/${match.slug || match.id}`}
      className="group relative flex flex-col mb-3 mx-4 mt-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute inset-0 bg-linear-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
      <div className="relative flex overflow-hidden rounded-lg clip-angled glass-morphism bg-surface-card border border-surface-border">
        {isMyMatch && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />}
        {/* Home */}
        <div className="flex-1 flex items-center justify-between p-3 pl-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
            style={{ background: `linear-gradient(to right, ${match.home_team.color}, transparent)` }} />
          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg ring-1 ring-white/10 overflow-hidden bg-surface-card"
              style={{ borderLeft: `3px solid ${match.home_team.color}` }}>
              {match.home_team.logo_url ? <img src={match.home_team.logo_url} alt="" className="w-7 h-7 object-contain" /> : match.home_team.name[0]}
            </div>
            <span className={clsx('text-sm uppercase tracking-wide truncate transition-colors',
              variant === 'result' ? (homeWon ? 'font-black text-text-primary' : 'font-semibold text-text-muted') : 'font-bold text-text-secondary group-hover:text-text-primary')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.home_team.name}
            </span>
          </div>
          {variant === 'result' && (
            <span className={clsx('text-3xl font-black tabular-nums leading-none ml-3 z-10',
              homeWon ? 'text-text-primary text-glow-sm' : 'text-text-muted')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.home_score}
            </span>
          )}
        </div>
        {/* Centre */}
        <div className="w-12 shrink-0 flex flex-col items-center justify-center relative bg-black/20 z-20"
          style={{ clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0% 100%)' }}>
          {variant === 'result' ? (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">FT</span>
              <div className="w-0.5 h-4 bg-surface-border mt-1" />
            </div>
          ) : match.scheduled_at ? (
            <span className="text-[11px] font-black text-primary-500 dark:text-primary-400 tracking-wider">{formatTime(match.scheduled_at)}</span>
          ) : (
            <span className="text-[10px] font-bold text-text-muted uppercase">VS</span>
          )}
        </div>
        {/* Away */}
        <div className="flex-1 flex items-center justify-between p-3 pr-4 relative overflow-hidden flex-row-reverse">
          <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
            style={{ background: `linear-gradient(to left, ${match.away_team.color}, transparent)` }} />
          <div className="flex items-center gap-3 relative z-10 min-w-0 flex-row-reverse">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg ring-1 ring-white/10 overflow-hidden bg-surface-card"
              style={{ borderRight: `3px solid ${match.away_team.color}` }}>
              {match.away_team.logo_url ? <img src={match.away_team.logo_url} alt="" className="w-7 h-7 object-contain" /> : match.away_team.name[0]}
            </div>
            <span className={clsx('text-sm uppercase tracking-wide truncate text-right transition-colors',
              variant === 'result' ? (awayWon ? 'font-black text-text-primary' : 'font-semibold text-text-muted') : 'font-bold text-text-secondary group-hover:text-text-primary')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.away_team.name}
            </span>
          </div>
          {variant === 'result' && (
            <span className={clsx('text-3xl font-black tabular-nums leading-none mr-3 z-10',
              awayWon ? 'text-text-primary text-glow-sm' : 'text-text-muted')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.away_score}
            </span>
          )}
        </div>
      </div>
      {variant === 'upcoming' && match.scheduled_at && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-surface-card border border-surface-border px-3 py-0.5 rounded-full z-30 shadow-md">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{formatDay(match.scheduled_at)}</span>
        </div>
      )}
    </Link>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</span>
      <Link to={href} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors font-semibold">
        Tout voir <ArrowRight size={11} />
      </Link>
    </div>
  )
}

// ── Top scorer card ───────────────────────────────────────────────────────────
function TopScorerCard({ scorer }: { scorer: NonNullable<ReturnType<typeof useScorers>['data']>[0] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 bg-surface-card border-surface-border shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 100% 0%, ${scorer.team_color}15 0%, transparent 60%)` }} />
      <div className="flex items-center gap-1 mb-3">
        <Flame size={11} className="text-orange-500 dark:text-orange-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Meilleur buteur</span>
      </div>
      <div className="flex items-center gap-3 relative">
        <div className="relative shrink-0">
          <PlayerAvatar firstName={scorer.first_name} lastName={scorer.last_name}
            avatarUrl={scorer.avatar_url} teamColor={scorer.team_color} size={44} shape="lg" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center border-2 border-surface-card">
            <Target size={9} className="text-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate leading-tight text-text-primary">{scorer.first_name} {scorer.last_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: scorer.team_color }} />
            <span className="text-xs truncate text-text-muted">{scorer.team_name}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black text-orange-500 dark:text-orange-400 tabular-nums leading-none">{scorer.goals}</p>
          <p className="text-[10px] mt-0.5 text-text-muted">buts</p>
        </div>
      </div>
    </div>
  )
}

// ── Leader card ───────────────────────────────────────────────────────────────
function LeaderCard({ team }: { team: NonNullable<ReturnType<typeof useStandings>['data']>[0] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 bg-surface-card border-surface-border shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${team.team_color}10 0%, transparent 70%)` }} />
      <div className="flex items-center gap-1 mb-3">
        <Trophy size={11} className="text-yellow-500 dark:text-yellow-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Leader</span>
      </div>
      <div className="flex items-center gap-3 relative">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg shrink-0"
          style={{ backgroundColor: team.team_color }}>
          {team.team_logo ? <img src={team.team_logo} alt="" className="w-9 h-9 object-contain rounded-lg" /> : team.team_name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate leading-tight text-text-primary">{team.team_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">{team.won}V</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">{team.drawn}N</span>
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{team.lost}D</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black tabular-nums leading-none" style={{ color: team.team_color }}>{team.points}</p>
          <p className="text-[10px] mt-0.5 text-text-muted">pts</p>
        </div>
      </div>
    </div>
  )
}

// ── Live match banner ─────────────────────────────────────────────────────────
function LiveMatchBannerItem({ match }: { match: MatchWithTeams }) {
  const clock = useLiveClock(
    match.live_started_at, match.live_period as 1 | 2, match.status,
    match.halftime_at, match.is_paused ?? false, match.paused_at ?? null, match.total_paused_seconds ?? 0
  )
  return (
    <Link to={`/matches/${match.slug || match.id}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised/50 hover:bg-surface-raised border border-red-500/20 transition-all group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg"
          style={{ backgroundColor: match.home_team.color }}>
          {match.home_team.logo_url ? <img src={match.home_team.logo_url} alt="" className="w-6 h-6 object-contain rounded-md" /> : match.home_team.name[0]}
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">{match.home_team.name}</span>
      </div>
      <div className="flex flex-col items-center gap-1 px-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-text-primary tabular-nums drop-shadow-md">{match.home_score ?? 0}</span>
          <span className="text-text-muted font-bold">–</span>
          <span className="text-2xl font-black text-text-primary tabular-nums drop-shadow-md">{match.away_score ?? 0}</span>
        </div>
        <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse border border-red-400/20">
          {clock.label}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-sm font-semibold text-text-primary truncate text-right">{match.away_team.name}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg"
          style={{ backgroundColor: match.away_team.color }}>
          {match.away_team.logo_url ? <img src={match.away_team.logo_url} alt="" className="w-6 h-6 object-contain rounded-md" /> : match.away_team.name[0]}
        </div>
      </div>
    </Link>
  )
}

// ── Carte de salutation personnalisée ────────────────────────────────────────
function WelcomeCard({ profile, myPlayer, myTeam, role }: {
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>
  myPlayer: ReturnType<typeof useMyTeam>['myPlayer']
  myTeam: ReturnType<typeof useMyTeam>['myTeam']
  role: string
}) {
  const displayName = myPlayer
    ? `${myPlayer.first_name} ${myPlayer.last_name}`
    : profile.full_name ?? profile.email.split('@')[0]

  const roleLabel = role === 'admin' ? 'Administrateur' : role === 'captain' ? 'Capitaine' : role === 'player' ? 'Joueur' : 'Spectateur'
  const roleColor = role === 'admin' ? '#f59e0b' : role === 'captain' ? '#8b5cf6' : role === 'player' ? '#22c55e' : '#64748b'
  const roleIcon = role === 'admin' ? <Settings size={11} /> : role === 'captain' ? <Crown size={11} /> : role === 'player' ? <Zap size={11} /> : <Users size={11} />

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4 flex items-center gap-4">
      {/* Glow de fond */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 100% at 0% 50%, ${roleColor}10 0%, transparent 70%)` }} />

      {/* Avatar */}
      <div className="relative shrink-0">
        <PlayerAvatar
          firstName={myPlayer?.first_name ?? (profile.full_name?.split(' ')[0] ?? 'U')}
          lastName={myPlayer?.last_name ?? (profile.full_name?.split(' ')[1] ?? '')}
          avatarUrl={profile.avatar_url}
          teamColor={myTeam?.color ?? roleColor}
          size={52}
          shape="lg"
        />
        {/* Badge rôle */}
        <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full border-2 border-surface-card"
          style={{ backgroundColor: roleColor }}>
          <span style={{ color: '#fff', display: 'flex' }}>{roleIcon}</span>
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0 relative">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Bienvenue</p>
        <p className="text-base font-black text-text-primary truncate">{displayName}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: roleColor, backgroundColor: `${roleColor}15`, borderColor: `${roleColor}30` }}>
            {roleLabel}
          </span>
          {myTeam && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: myTeam.color }} />
              <span className="text-[10px] text-text-muted font-semibold truncate">{myTeam.name}</span>
            </div>
          )}
          {myPlayer?.jersey_number && (
            <span className="text-[10px] text-text-muted font-bold">#{myPlayer.jersey_number}</span>
          )}
        </div>
      </div>

      {/* Raccourci profil */}
      <Link to="/profile"
        className="shrink-0 p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors border border-surface-border"
        title="Mon profil">
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}

// ── Mes stats perso (joueur / capitaine) ──────────────────────────────────────
function MyStatsCard({ playerId, seasonId }: { playerId: string; seasonId: string }) {
  const { data: profile, isLoading } = usePlayerProfile(playerId)
  const { data: mvpData } = usePlayerMvp(playerId, seasonId)
  const { data: discipline } = usePlayerDiscipline(playerId, seasonId)

  if (isLoading) return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4 animate-pulse">
      <div className="h-3 w-24 bg-surface-raised rounded mb-4" />
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-14 bg-surface-raised rounded-xl" />)}
      </div>
    </div>
  )

  if (!profile) return null

  const stats = [
    { label: 'Matchs', value: profile.matches_played, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Buts', value: profile.goals, icon: Target, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Passes', value: profile.assists, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { label: 'MVP', value: mvpData?.total_mvp ?? 0, icon: Star, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Cartons', value: (discipline?.yellow_cards ?? 0) + (discipline?.red_cards ?? 0), icon: Shield, color: 'text-red-400', bg: 'bg-red-400/10', sub: `${discipline?.yellow_cards ?? 0}J / ${discipline?.red_cards ?? 0}R` },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 100% 0%, ${profile.team.color}10 0%, transparent 60%)` }} />
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={12} className="text-text-muted" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mes stats · Saison</span>
        </div>
        <Link to={`/players/${profile.slug || profile.id}`}
          className="text-[10px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors">
          Profil complet <ChevronRight size={10} />
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-1.5 relative">
        {stats.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className={clsx('rounded-xl p-2 text-center flex flex-col items-center justify-center min-w-0', bg)}>
            <Icon size={12} className={clsx('mb-1', color)} />
            <p className="text-lg font-black text-text-primary tabular-nums leading-none">{value}</p>
            <p className="text-[8px] text-text-muted uppercase tracking-wider mt-0.5 truncate w-full">{label}</p>
            {sub && <p className="text-[7px] text-text-muted mt-0.5 font-bold truncate w-full">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Carte Mon Équipe (Joueur / Capitaine) ─────────────────────────────────────
function MyTeamCard({ teamId, seasonId }: { teamId: string; seasonId: string }) {
  const { data: standings } = useStandings(seasonId)
  const myStanding = useMemo(() => standings?.find(s => s.team_id === teamId), [standings, teamId])
  const rank = useMemo(() => {
    if (!standings) return null
    return standings.findIndex(s => s.team_id === teamId) + 1
  }, [standings, teamId])

  if (!myStanding) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${myStanding.team_color}10 0%, transparent 70%)` }} />
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-text-muted" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mon équipe</span>
        </div>
        <Link to={`/teams/${myStanding.team_id}`}
          className="text-[10px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors">
          Page d'équipe <ChevronRight size={10} />
        </Link>
      </div>
      
      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
            style={{ backgroundColor: myStanding.team_color }}>
            {myStanding.team_logo ? <img src={myStanding.team_logo} alt="" className="w-10 h-10 object-contain rounded-lg" /> : myStanding.team_name[0]}
          </div>
          <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-black border-2 border-surface-card">
            {rank}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-text-primary truncate leading-tight mb-1">{myStanding.team_name}</p>
          <div className="flex items-center gap-1.5">
            {myStanding.form.slice(-3).map((res, i) => (
              <span key={i} className={clsx(
                "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black",
                res === 'W' ? "bg-green-500/20 text-green-400" : res === 'D' ? "bg-slate-500/20 text-slate-400" : "bg-red-500/20 text-red-400"
              )}>
                {res}
              </span>
            ))}
            <span className="text-[10px] text-text-muted font-bold ml-1 uppercase tracking-wider">Forme</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-text-primary tabular-nums leading-none">{myStanding.points}</p>
          <p className="text-[10px] mt-0.5 text-text-muted uppercase font-bold">Points</p>
        </div>
      </div>
    </div>
  )
}

// ── Raccourcis capitaine ──────────────────────────────────────────────────────
function CaptainQuickActions({ myTeam, nextMatch, myTeamId }: {
  myTeam: ReturnType<typeof useMyTeam>['myTeam']
  nextMatch?: MatchWithTeams
  myTeamId: string | null
}) {
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Crown size={13} className="text-purple-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Espace Capitaine</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link to="/captain"
          className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors group">
          <Users size={14} className="text-purple-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-primary truncate">Mon équipe</p>
            {myTeam && <p className="text-[10px] text-text-muted truncate">{myTeam.name}</p>}
          </div>
        </Link>
        {nextMatch && myTeamId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-raised/50 border border-surface-border">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Compo J{nextMatch.matchday}</p>
              <LineupStatusBadge matchId={nextMatch.id} teamId={myTeamId} isCaptain />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Raccourcis admin ──────────────────────────────────────────────────────────
function AdminQuickActions({ completedCount, teamsCount, upcomingCount, pendingSpectatorsCount, onTestNotif }: {
  completedCount: number; teamsCount: number; upcomingCount: number; pendingSpectatorsCount: number; onTestNotif: () => void
}) {
  const actions = [
    { label: 'Matchs', sub: `${completedCount} terminés`, icon: Calendar, to: '/admin/matches', color: '#3b82f6' },
    { label: 'Équipes', sub: `${teamsCount} équipes`, icon: Shield, to: '/admin/teams', color: '#8b5cf6' },
    { label: 'Spectateurs', sub: `${pendingSpectatorsCount} en attente`, icon: Users, to: '/admin/spectators', color: '#10b981', alert: pendingSpectatorsCount > 0 },
    { label: 'Saisons', sub: 'Gérer', icon: Trophy, to: '/admin/seasons', color: '#f59e0b' },
  ]
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={13} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Administration</span>
        </div>
        <button
          onClick={onTestNotif}
          className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors border border-amber-400/20"
        >
          Tester Notif
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ label, sub, icon: Icon, to, color, alert }) => (
          <Link key={to} to={to}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-raised/50 border border-surface-border hover:bg-surface-raised transition-colors group relative">
            {alert && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20` }}>
              <Icon size={13} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{label}</p>
              <p className="text-[10px] text-text-muted truncate">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
import { useNotificationSW } from '@/hooks/useNotificationSW'

export function DashboardPage() {
  const { data: season, isLoading: seasonLoading, isFetched } = useActiveSeason()
  const { data: matches } = useMatches(season?.id)
  const { data: teams }   = useTeams(season?.id)
  const { data: scorers } = useScorers(season?.id)
  const { data: standings } = useStandings(season?.id)
  const { myTeamId, myTeam, myPlayer } = useMyTeam(season?.id)
  const { isCaptain, isAdmin, profile, role } = useAuth()
  const { sendNotification } = useNotificationSW(profile?.id)

  const handleTestNotification = () => {
    sendNotification(
      'Test League H5 🏆',
      'Ceci est une notification de test pour vérifier que tout fonctionne !',
      { url: '/dashboard', force: true }
    )
  }
  const { data: spectators } = useSpectators(isAdmin ? undefined : season?.id)

  const pendingSpectatorsCount = useMemo(() => {
    if (!isAdmin || !spectators) return 0
    return spectators.filter(s => s.status === 'pending').length
  }, [isAdmin, spectators])

  useRealtimeTeams(season?.id)
  useRealtimeMatches(season?.id)

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [])

  const isLoading = seasonLoading && !timedOut && !isFetched

  const completedMatches = (matches ?? []).filter(m => m.status === 'completed')
  const liveMatches      = (matches ?? []).filter(m => m.status === 'live')
  const upcomingMatches  = (matches ?? [])
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => {
      if (a.scheduled_at && b.scheduled_at)
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      if (a.scheduled_at) return -1
      if (b.scheduled_at) return 1
      return a.matchday - b.matchday
    })
  const recentMatches = [...completedMatches]
    .filter(m => m.played_at)
    .sort((a, b) => new Date(b.played_at!).getTime() - new Date(a.played_at!).getTime())
    .slice(0, 5)

  // Prochain match de mon équipe (capitaine / joueur)
  const myNextMatch = useMemo(() => {
    if (!myTeamId) return upcomingMatches[0] ?? null
    return upcomingMatches.find(m => m.home_team_id === myTeamId || m.away_team_id === myTeamId)
      ?? upcomingMatches[0]
      ?? null
  }, [upcomingMatches, myTeamId])

  const topScorer = scorers?.[0]
  const topTeam   = standings?.[0]

  // Rôle effectif
  const isPlayer   = role === 'player' || role === 'captain' || role === 'admin'
  const hasTeam    = !!myTeamId && !!myPlayer

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <SkeletonKpiGrid count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-0 overflow-hidden lg:col-span-2">
            {[1,2,3].map(i => <SkeletonMatchCard key={i} />)}
          </div>
          <div className="space-y-3">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        </div>
      </div>
    )
  }

  if (!season) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Trophy size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400 font-semibold">Aucune saison active</p>
          <p className="text-slate-600 text-sm mt-1">Contactez l'administrateur</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Matchs en direct ── */}
      {liveMatches.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 p-4 bg-red-500/5 dark:bg-transparent">
          <div className="absolute inset-0 pointer-events-none dark:block hidden"
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(15,20,32,0.95) 100%)' }} />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
          <div className="flex items-center gap-2 mb-3">
            <Radio size={14} className="text-red-400 animate-pulse" />
            <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">En direct</span>
            <LiveBadge size="sm" />
          </div>
          <div className="space-y-2">
            {liveMatches.map(match => <LiveMatchBannerItem key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {/* ── Carte de bienvenue personnalisée ── */}
      {profile && (
        <WelcomeCard
          profile={profile}
          myPlayer={myPlayer}
          myTeam={myTeam}
          role={role ?? 'spectator'}
        />
      )}

      {/* ── Hero saison ── */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80&auto=format&fit=crop"
        pattern="pitch"
        accentColor="#2563eb"
        title={season.name}
        subtitle="Tableau de bord · Saison en cours"
        icon={<Trophy size={20} className="text-white" />}
        badge={
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/15 border border-green-500/25 px-2.5 py-1 rounded-full">
            <span className="live-dot" />
            En cours
          </span>
        }
        compact
      />

      {/* ── KPIs globaux ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <KpiCard label="Matchs joués" value={completedMatches.length}                        icon={Calendar} color="#3b82f6" />
        <KpiCard label="Équipes"      value={teams?.length ?? 0}                             icon={Users}    color="#8b5cf6" />
        <KpiCard label="Buteurs"      value={scorers?.filter(s => s.goals > 0).length ?? 0}  icon={Target}   color="#f97316" />
        <KpiCard label="À venir"      value={upcomingMatches.length}                         icon={Calendar} color="#2563eb" />
      </div>

      {/* ── Mes stats perso (joueur / capitaine) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {hasTeam && myPlayer && season && (
          <MyStatsCard playerId={myPlayer.id} seasonId={season.id} />
        )}
        {hasTeam && myTeamId && season && (
          <MyTeamCard teamId={myTeamId} seasonId={season.id} />
        )}
      </div>

      {/* ── Raccourcis capitaine ── */}
      {isCaptain && !isAdmin && myTeam && (
        <CaptainQuickActions myTeam={myTeam} nextMatch={myNextMatch ?? undefined} myTeamId={myTeamId} />
      )}

      {/* ── Raccourcis admin ── */}
      {isAdmin && (
        <AdminQuickActions
          completedCount={completedMatches.length}
          teamsCount={teams?.length ?? 0}
          upcomingCount={upcomingMatches.length}
          pendingSpectatorsCount={pendingSpectatorsCount}
          onTestNotif={handleTestNotification}
        />
      )}

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Prochains matchs */}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card lg:col-span-2">
          <SectionHeader title="Prochains matchs" href="/matches" />
          {upcomingMatches.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon"><Calendar size={18} /></div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Aucun match programmé</p>
            </div>
          ) : (
            <div className="stagger-fast">
              {/* Compte à rebours uniquement pour les joueurs/capitaines avec une équipe */}
              {myNextMatch?.scheduled_at && isPlayer && (
                <NextMatchCountdown match={myNextMatch} teamId={myTeamId} isCaptain={isCaptain} />
              )}
              {upcomingMatches.slice(0, 4).map(match => (
                <MiniMatchCard key={match.id} match={match} variant="upcoming" myTeamId={myTeamId} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar : meilleur buteur + leader */}
        <div className="space-y-3">
          {topScorer && <TopScorerCard scorer={topScorer} />}
          {topTeam   && <LeaderCard   team={topTeam} />}
        </div>
      </div>

      {/* ── Derniers résultats ── */}
      {recentMatches.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
          <SectionHeader title="Derniers résultats" href="/matches" />
          <div className="stagger-fast">
            {recentMatches.map(match => (
              <MiniMatchCard key={match.id} match={match} variant="result" myTeamId={myTeamId} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
