import { useState, useEffect } from 'react'
import { Calendar, Trophy, Target, Users, ArrowRight, TrendingUp, Flame, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { useMyTeam } from '@/hooks/useMyTeam'
import { useCountUp } from '@/hooks/useCountUp'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonKpiGrid, SkeletonCard, SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
import { LiveBadge } from '@/components/live/LiveBadge'
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

// ── KPI Card premium ──────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, trend }: {
  label: string
  value: number
  icon: typeof Calendar
  color: string
  trend?: string
}) {
  const animatedValue = useCountUp(value)

  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 group transition-all duration-500 hover:-translate-y-1.5"
      style={{ 
        background: 'rgba(22, 28, 45, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.08)'
      }}>
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-24 h-24 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none"
        style={{ backgroundColor: color }} />

      {/* Top row */}
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

      {/* Value */}
      <p className="text-3xl font-black tabular-nums leading-none tracking-tight text-white drop-shadow-sm">
        {animatedValue}
      </p>
      <p className="text-[11px] mt-2 font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
        {label}
      </p>

      {/* Interactive border glow */}
      <div className="absolute inset-0 border border-transparent group-hover:border-white/10 rounded-2xl transition-all duration-500" />
    </div>
  )
}

// ── Mini match card premium ───────────────────────────────────────────────────
function MiniMatchCard({ match, variant, myTeamId }: { 
  match: MatchWithTeams
  variant: 'upcoming' | 'result'
  myTeamId?: string | null
}) {
  const homeWon = match.home_score! > match.away_score!
  const awayWon = match.away_score! > match.home_score!
  const isDraw  = match.home_score === match.away_score
  const isMyMatch = myTeamId && (match.home_team_id === myTeamId || match.away_team_id === myTeamId)

  return (
    <Link
      to={`/matches/${match.id}`}
      className="group relative flex flex-col mb-3 mx-4 mt-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
    >
      {/* Lueur arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
      
      {/* Conteneur principal biseauté */}
      <div className="relative flex overflow-hidden rounded-lg clip-angled glass-morphism bg-surface-card/80 border border-white/5">
        
        {/* Ligne d'accentuation (si c'est mon équipe) */}
        {isMyMatch && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
        )}

        {/* DOMICILE (HOME) */}
        <div className="flex-1 flex items-center justify-between p-3 pl-4 relative overflow-hidden">
          {/* Dégradé couleur équipe */}
          <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
               style={{ background: `linear-gradient(to right, ${match.home_team.color}, transparent)` }} />
          
          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg ring-1 ring-white/10 overflow-hidden bg-surface-card"
              style={{ borderLeft: `3px solid ${match.home_team.color}` }}>
              {match.home_team.logo_url
                ? <img src={match.home_team.logo_url} alt="" className="w-7 h-7 object-contain" />
                : match.home_team.name[0]
              }
            </div>
            <span className={clsx(
              'text-sm uppercase tracking-wide truncate',
              variant === 'result' ? (homeWon ? 'font-black text-white' : 'font-semibold text-slate-400') : 'font-bold text-slate-200'
            )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.home_team.name}
            </span>
          </div>

          {/* Score Domicile (seulement si résultat) */}
          {variant === 'result' && (
            <span className={clsx(
              'text-3xl font-black tabular-nums leading-none ml-3 z-10',
              homeWon ? 'text-white text-glow-sm' : 'text-slate-500'
            )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.home_score}
            </span>
          )}
        </div>

        {/* CENTRE (SÉPARATEUR OU HEURE) */}
        <div className="w-12 shrink-0 flex flex-col items-center justify-center relative bg-black/40 z-20"
             style={{ clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0% 100%)' }}>
          {variant === 'result' ? (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FT</span>
              <div className="w-0.5 h-4 bg-surface-border mt-1" />
            </div>
          ) : match.scheduled_at ? (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-black text-primary-400 tracking-wider">
                {formatTime(match.scheduled_at)}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-slate-500 uppercase">VS</span>
          )}
        </div>

        {/* EXTÉRIEUR (AWAY) */}
        <div className="flex-1 flex items-center justify-between p-3 pr-4 relative overflow-hidden flex-row-reverse">
          {/* Dégradé couleur équipe */}
          <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
               style={{ background: `linear-gradient(to left, ${match.away_team.color}, transparent)` }} />
          
          <div className="flex items-center gap-3 relative z-10 min-w-0 flex-row-reverse">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg ring-1 ring-white/10 overflow-hidden bg-surface-card"
              style={{ borderRight: `3px solid ${match.away_team.color}` }}>
              {match.away_team.logo_url
                ? <img src={match.away_team.logo_url} alt="" className="w-7 h-7 object-contain" />
                : match.away_team.name[0]
              }
            </div>
            <span className={clsx(
              'text-sm uppercase tracking-wide truncate text-right',
              variant === 'result' ? (awayWon ? 'font-black text-white' : 'font-semibold text-slate-400') : 'font-bold text-slate-200'
            )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.away_team.name}
            </span>
          </div>

          {/* Score Extérieur (seulement si résultat) */}
          {variant === 'result' && (
            <span className={clsx(
              'text-3xl font-black tabular-nums leading-none mr-3 z-10',
              awayWon ? 'text-white text-glow-sm' : 'text-slate-500'
            )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.away_score}
            </span>
          )}
        </div>
      </div>
      
      {/* Ligne date/journée (si à venir) */}
      {variant === 'upcoming' && match.scheduled_at && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-surface-card border border-white/10 px-3 py-0.5 rounded-full z-30 shadow-md">
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            {formatDay(match.scheduled_at)}
          </span>
        </div>
      )}
    </Link>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
      <span className="text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>{title}</span>
      <Link to={href} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors font-semibold">
        Tout voir <ArrowRight size={11} />
      </Link>
    </div>
  )
}

// ── Top scorer card premium ───────────────────────────────────────────────────
function TopScorerCard({ scorer }: { scorer: NonNullable<ReturnType<typeof useScorers>['data']>[0] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4"
      style={{ 
        background: 'var(--card-bg, linear-gradient(135deg, #161c2d 0%, #111827 100%))',
        borderColor: 'var(--color-surface-border)'
      }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 100% 0%, ${scorer.team_color}15 0%, transparent 60%)` }} />

      <div className="flex items-center gap-1 mb-3">
        <Flame size={11} className="text-orange-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>Meilleur buteur</span>
      </div>

      <div className="flex items-center gap-3 relative">
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg"
            style={{ backgroundColor: scorer.team_color }}>
            {scorer.first_name[0]}{scorer.last_name[0]}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center border-2"
            style={{ borderColor: 'var(--color-surface-card, #111827)' }}>
            <Target size={9} className="text-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate leading-tight" style={{ color: 'var(--color-text-primary)' }}>
            {scorer.first_name} {scorer.last_name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: scorer.team_color }} />
            <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{scorer.team_name}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black text-orange-400 tabular-nums leading-none">{scorer.goals}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>buts</p>
        </div>
      </div>
    </div>
  )
}

// ── Leader card premium ───────────────────────────────────────────────────────
function LeaderCard({ team }: { team: NonNullable<ReturnType<typeof useStandings>['data']>[0] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4"
      style={{
        background: `linear-gradient(135deg, ${team.team_color}12 0%, var(--color-surface-card, #111827) 60%)`,
        borderColor: `${team.team_color}30`,
      }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${team.team_color}10 0%, transparent 70%)` }} />

      <div className="flex items-center gap-1 mb-3">
        <Trophy size={11} className="text-yellow-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>Leader</span>
      </div>

      <div className="flex items-center gap-3 relative">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg shrink-0"
          style={{ backgroundColor: team.team_color }}>
          {team.team_logo
            ? <img src={team.team_logo} alt="" className="w-9 h-9 object-contain rounded-lg" />
            : team.team_name[0]
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate leading-tight" style={{ color: 'var(--color-text-primary)' }}>{team.team_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">{team.won}V</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-raised, rgba(255,255,255,0.05))' }}>{team.drawn}N</span>
            <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">{team.lost}D</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black tabular-nums leading-none" style={{ color: team.team_color }}>{team.points}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>pts</p>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { data: season, isLoading: seasonLoading, isFetched } = useActiveSeason()
  const { data: matches } = useMatches(season?.id)
  const { data: teams }   = useTeams(season?.id)
  const { data: scorers } = useScorers(season?.id)
  const { data: standings } = useStandings(season?.id)
  const { myTeamId } = useMyTeam(season?.id)

  useRealtimeMatches(season?.id)
  useRealtimeTeams(season?.id)

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [])

  const isLoading = seasonLoading && !timedOut && !isFetched

  const completedMatches = (matches ?? []).filter(m => m.status === 'completed')
  const liveMatches = (matches ?? []).filter(m => m.status === 'live')
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

  const topScorer = scorers?.[0]
  const topTeam   = standings?.[0]

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

      {/* ── Widget matchs en cours ── */}
      {liveMatches.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 p-4"
          style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(15,20,32,0.95) 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
          <div className="flex items-center gap-2 mb-3">
            <Radio size={14} className="text-red-400 animate-pulse" />
            <span className="text-sm font-black text-white uppercase tracking-wider">En direct</span>
            <LiveBadge size="sm" />
          </div>
          <div className="space-y-2">
            {liveMatches.map(match => (
              <Link
                key={match.id}
                to={`/matches/${match.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-red-500/20 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ backgroundColor: match.home_team.color }}>
                    {match.home_team.logo_url
                      ? <img src={match.home_team.logo_url} alt="" className="w-6 h-6 object-contain rounded-md" />
                      : match.home_team.name[0]}
                  </div>
                  <span className="text-sm font-semibold text-white truncate">{match.home_team.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xl font-black text-white tabular-nums">{match.home_score ?? 0}</span>
                  <span className="text-slate-600">–</span>
                  <span className="text-xl font-black text-white tabular-nums">{match.away_score ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-semibold text-white truncate text-right">{match.away_team.name}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ backgroundColor: match.away_team.color }}>
                    {match.away_team.logo_url
                      ? <img src={match.away_team.logo_url} alt="" className="w-6 h-6 object-contain rounded-md" />
                      : match.away_team.name[0]}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80&auto=format&fit=crop"
        pattern="pitch"
        accentColor="#2563eb"
        title={season.name}
        subtitle="Tableau de bord · Saison en cours"
        icon={<Trophy size={20} className="text-white" />}
        badge={
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-400
                           bg-green-500/15 border border-green-500/25 px-2.5 py-1 rounded-full">
            <span className="live-dot" />
            En cours
          </span>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <KpiCard label="Matchs joués" value={completedMatches.length}                       icon={Calendar} color="#3b82f6" />
        <KpiCard label="Équipes"      value={teams?.length ?? 0}                            icon={Users}    color="#8b5cf6" />
        <KpiCard label="Buteurs"      value={scorers?.filter(s => s.goals > 0).length ?? 0} icon={Target}   color="#f97316" />
        <KpiCard label="À venir"      value={upcomingMatches.length}                        icon={Calendar} color="#2563eb" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Prochains matchs */}
        <div className="overflow-hidden rounded-2xl border lg:col-span-2"
          style={{ background: 'var(--card-bg, linear-gradient(135deg, #161c2d 0%, #111827 100%))', borderColor: 'var(--color-surface-border)' }}>
          <SectionHeader title="Prochains matchs" href="/matches" />
          {upcomingMatches.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon"><Calendar size={18} /></div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Aucun match programmé</p>
            </div>
          ) : (
            <div className="stagger-fast">
              {upcomingMatches.slice(0, 4).map(match => (
                <MiniMatchCard key={match.id} match={match} variant="upcoming" myTeamId={myTeamId} />
              ))}
            </div>
          )}
        </div>

        {/* Top scorer + leader */}
        <div className="space-y-3">
          {topScorer && <TopScorerCard scorer={topScorer} />}
          {topTeam   && <LeaderCard   team={topTeam} />}
        </div>
      </div>

      {/* Derniers résultats */}
      {recentMatches.length > 0 && (
        <div className="overflow-hidden rounded-2xl border"
          style={{ background: 'var(--card-bg, linear-gradient(135deg, #161c2d 0%, #111827 100%))', borderColor: 'var(--color-surface-border)' }}>
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
