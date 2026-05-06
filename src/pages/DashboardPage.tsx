import { useState, useEffect } from 'react'
import { Calendar, Trophy, Target, Users, ArrowRight, TrendingUp, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { useMyTeam } from '@/hooks/useMyTeam'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonKpiGrid, SkeletonCard, SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
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
function KpiCard({ label, value, icon: Icon, color, bg, trend }: {
  label: string
  value: number
  icon: typeof Calendar
  color: string
  bg: string
  trend?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 group transition-all duration-300 hover:-translate-y-1"
      style={{ 
        background: 'var(--card-bg, linear-gradient(135deg, #161c2d 0%, #111827 100%))',
        borderColor: 'var(--color-surface-border)'
      }}>
      {/* Glow accent */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 0% 0%, ${color}12 0%, transparent 70%)` }} />

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}25` }}>
          <Icon size={15} style={{ color }} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <TrendingUp size={9} /> {trend}
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-3xl font-black tabular-nums leading-none tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
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
  const isMyTeamHome = match.home_team_id === myTeamId
  const isMyTeamAway = match.away_team_id === myTeamId

  return (
    <Link
      to={`/matches/${match.id}`}
      className={clsx(
        "group flex items-center gap-3 px-4 py-3.5 transition-all duration-150 last:border-b-0",
        isMyMatch && "border-l-2 border-l-primary-500/50"
      )}
      style={{ 
        borderBottom: '1px solid var(--color-surface-border)',
        backgroundColor: isMyMatch ? 'rgba(37,99,235,0.04)' : undefined
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-raised, rgba(255,255,255,0.03))' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isMyMatch ? 'rgba(37,99,235,0.04)' : '' }}
    >
      {/* Home */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg"
          style={{ backgroundColor: match.home_team.color }}>
          {match.home_team.logo_url
            ? <img src={match.home_team.logo_url} alt="" className="w-7 h-7 object-contain rounded-md" />
            : match.home_team.name[0]
          }
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={clsx(
            'text-sm font-semibold truncate transition-colors',
            variant === 'result' ? (homeWon ? '' : '') : ''
          )}
          style={{ color: variant === 'result' ? (homeWon ? 'var(--color-text-primary)' : 'var(--color-text-muted)') : 'var(--color-text-secondary)' }}>
            {match.home_team.name}
          </span>
          {isMyTeamHome && (
            <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30 text-[9px] px-1.5 py-0.5 shrink-0">
              Mon équipe
            </span>
          )}
        </div>
      </div>

      {/* Center */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 min-w-[72px]">
        {variant === 'result' ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg border"
              style={{ backgroundColor: 'var(--color-surface-raised, rgba(0,0,0,0.3))', borderColor: 'var(--color-surface-border)' }}>
              <span className="text-base font-black tabular-nums"
                style={{ color: homeWon ? 'var(--color-text-primary)' : isDraw ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {match.home_score}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>–</span>
              <span className="text-base font-black tabular-nums"
                style={{ color: awayWon ? 'var(--color-text-primary)' : isDraw ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {match.away_score}
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>FT</span>
          </>
        ) : match.scheduled_at ? (
          <>
            <span className="text-sm font-black tabular-nums bg-primary-600/20 px-2.5 py-1 rounded-lg border border-primary-600/20 text-primary-400">
              {formatTime(match.scheduled_at)}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{formatDay(match.scheduled_at)}</span>
          </>
        ) : (
          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-raised)' }}>À venir</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
          {isMyTeamAway && (
            <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30 text-[9px] px-1.5 py-0.5 shrink-0">
              Mon équipe
            </span>
          )}
          <span className="text-sm font-semibold truncate text-right transition-colors"
            style={{ color: variant === 'result' ? (awayWon ? 'var(--color-text-primary)' : 'var(--color-text-muted)') : 'var(--color-text-secondary)' }}>
            {match.away_team.name}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg"
          style={{ backgroundColor: match.away_team.color }}>
          {match.away_team.logo_url
            ? <img src={match.away_team.logo_url} alt="" className="w-7 h-7 object-contain rounded-md" />
            : match.away_team.name[0]
          }
        </div>
      </div>
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
        stats={[
          { label: 'Matchs joués', value: completedMatches.length },
          { label: 'Équipes',      value: teams?.length ?? 0 },
          { label: 'Buteurs',      value: scorers?.filter(s => s.goals > 0).length ?? 0 },
          { label: 'À venir',      value: upcomingMatches.length },
        ]}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <KpiCard label="Matchs joués" value={completedMatches.length}                              icon={Calendar} color="#3b82f6" bg="blue" />
        <KpiCard label="Équipes"      value={teams?.length ?? 0}                                   icon={Users}    color="#8b5cf6" bg="violet" />
        <KpiCard label="Buteurs"      value={scorers?.filter(s => s.goals > 0).length ?? 0}        icon={Target}   color="#f97316" bg="orange" />
        <KpiCard label="À venir"      value={upcomingMatches.length}                               icon={Calendar} color="#2563eb" bg="blue" />
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
