import { useState, useMemo } from 'react'
import { Trophy, Download, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { useMatches } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { useMyTeam } from '@/hooks/useMyTeam'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonStandingsTable } from '@/components/ui/SkeletonLoader'
import { exportCSV } from '@/hooks/useExport'
import { FormBadge } from '@/components/ui/SharedBadges'
import { clsx } from 'clsx'
import type { StandingRow } from '@/hooks/useStandings'
import type { MatchWithTeams } from '@/hooks/useMatches'


type FilterType = 'all' | 'home' | 'away'

function computeFilteredStandings(
  standings: StandingRow[] | undefined,
  matches: import('@/hooks/useMatches').MatchWithTeams[] | undefined,
  filter: FilterType
): StandingRow[] | undefined {
  if (filter === 'all' || !matches || !standings) return standings

  const statsMap = new Map<string, {
    played: number; won: number; drawn: number; lost: number
    goals_for: number; goals_against: number; points: number
    form: Array<'W' | 'D' | 'L'>
  }>()

  for (const row of standings) {
    statsMap.set(row.team_id, {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      points: 0,
      form: []
    })
  }

  // Trier les matchs par journée pour calculer la forme dans l'ordre chronologique
  const sortedMatches = [...matches].sort((a, b) => a.matchday - b.matchday)

  for (const m of sortedMatches) {
    if (m.status !== 'completed' || m.home_score === null || m.away_score === null) continue
    const processTeam = (teamId: string, gf: number, ga: number) => {
      const s = statsMap.get(teamId)
      if (!s) return
      s.played++; s.goals_for += gf; s.goals_against += ga
      let res: 'W' | 'D' | 'L'
      if (gf > ga) { s.won++; s.points += 3; res = 'W' }
      else if (gf === ga) { s.drawn++; s.points += 1; res = 'D' }
      else { s.lost++; res = 'L' }
      s.form.push(res)
    }
    if (filter === 'home') processTeam(m.home_team_id, m.home_score, m.away_score)
    if (filter === 'away') processTeam(m.away_team_id, m.away_score, m.home_score)
  }

  return standings
    .map(row => {
      const s = statsMap.get(row.team_id)!
      // Inverser pour avoir le plus récent en premier
      const reversedForm = [...s.form].reverse()
      return { 
        ...row, 
        ...s, 
        form: reversedForm,
        goal_diff: s.goals_for - s.goals_against 
      }
    })
    .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for)
}

// ── Graphique d'évolution des points par journée ─────────────────────────────

function FormChart({
  standings,
  matches,
}: {
  standings: StandingRow[]
  matches: MatchWithTeams[]
}) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null)

  // Calculer les points cumulés par journée pour chaque équipe
  const chartData = useMemo(() => {
    const completedMatches = matches
      .filter(m => m.status === 'completed' && m.home_score !== null)
      .sort((a, b) => a.matchday - b.matchday)

    const matchdays = [...new Set(completedMatches.map(m => m.matchday))].sort((a, b) => a - b)
    if (matchdays.length === 0) return null

    // Points cumulés par équipe par journée
    const teamPoints = new Map<string, number[]>()
    const teamCumulative = new Map<string, number>()

    for (const row of standings) {
      teamPoints.set(row.team_id, [0])
      teamCumulative.set(row.team_id, 0)
    }

    for (const day of matchdays) {
      const dayMatches = completedMatches.filter(m => m.matchday === day)

      // Copier les points actuels avant la journée
      const snapshot = new Map(teamCumulative)

      for (const m of dayMatches) {
        const hs = m.home_score!
        const as_ = m.away_score!
        const homePoints = hs > as_ ? 3 : hs === as_ ? 1 : 0
        const awayPoints = as_ > hs ? 3 : hs === as_ ? 1 : 0
        teamCumulative.set(m.home_team_id, (teamCumulative.get(m.home_team_id) ?? 0) + homePoints)
        teamCumulative.set(m.away_team_id, (teamCumulative.get(m.away_team_id) ?? 0) + awayPoints)
      }

      for (const [teamId, pts] of teamCumulative) {
        teamPoints.get(teamId)?.push(pts)
      }
    }

    const maxPoints = Math.max(...[...teamCumulative.values()])
    return { matchdays, teamPoints, maxPoints, teamCount: standings.length }
  }, [standings, matches])

  if (!chartData || chartData.matchdays.length < 2) return null

  const { matchdays, teamPoints, maxPoints } = chartData
  const W = 600
  const H = 200
  const PAD = { top: 16, right: 24, bottom: 28, left: 32 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const totalPoints = matchdays.length + 1  // +1 pour le point de départ à 0

  const xScale = (i: number) => PAD.left + (i / (totalPoints - 1)) * chartW
  const yScale = (pts: number) => PAD.top + chartH - (maxPoints > 0 ? (pts / maxPoints) * chartH : 0)

  // Top 5 équipes seulement pour la lisibilité
  const topTeams = standings.slice(0, Math.min(5, standings.length))

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-primary-400" />
        <h3 className="text-xs font-black text-white uppercase tracking-widest">Évolution du classement</h3>
        <span className="text-[10px] text-slate-600 font-bold">— Points cumulés par journée</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 320, maxHeight: 200 }}
          aria-label="Graphique d'évolution des points"
        >
          {/* Grilles horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = PAD.top + chartH * (1 - pct)
            const pts = Math.round(maxPoints * pct)
            return (
              <g key={pct}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={PAD.left - 4} y={y + 4} textAnchor="end"
                  fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  {pts}
                </text>
              </g>
            )
          })}

          {/* Labels journées */}
          {[0, ...matchdays].map((_, i) => {
            const x = xScale(i)
            const label = i === 0 ? 'Dép.' : `J${matchdays[i - 1]}`
            return (
              <text key={i} x={x} y={H - 6} textAnchor="middle"
                fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                {label}
              </text>
            )
          })}

          {/* Lignes par équipe */}
          {topTeams.map(row => {
            const pts = teamPoints.get(row.team_id) ?? []
            if (pts.length < 2) return null
            const isHovered = hoveredTeam === row.team_id
            const isOther = hoveredTeam !== null && !isHovered

            const pathD = pts.map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p)}`
            ).join(' ')

            return (
              <g key={row.team_id}
                onMouseEnter={() => setHoveredTeam(row.team_id)}
                onMouseLeave={() => setHoveredTeam(null)}
                style={{ cursor: 'pointer' }}
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke={row.team_color}
                  strokeWidth={isHovered ? 2.5 : isOther ? 0.8 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isOther ? 0.25 : 1}
                  style={{ transition: 'all 0.2s ease' }}
                />
                {/* Point final */}
                {pts.length > 0 && (
                  <circle
                    cx={xScale(pts.length - 1)}
                    cy={yScale(pts[pts.length - 1])}
                    r={isHovered ? 4 : 2.5}
                    fill={row.team_color}
                    opacity={isOther ? 0.25 : 1}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3">
        {topTeams.map(row => (
          <button
            key={row.team_id}
            onMouseEnter={() => setHoveredTeam(row.team_id)}
            onMouseLeave={() => setHoveredTeam(null)}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider',
              hoveredTeam === row.team_id
                ? 'border-white/20 bg-white/8 text-white'
                : 'border-white/5 bg-transparent text-slate-500 hover:text-slate-300',
            )}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.team_color }} />
            {row.team_name}
            <span className="text-slate-600 font-black">{row.points}pts</span>
          </button>
        ))}
        {standings.length > 5 && (
          <span className="text-[10px] text-slate-700 font-bold self-center">
            +{standings.length - 5} équipes masquées
          </span>
        )}
      </div>
    </div>
  )
}

// ── Podium top 3 ─────────────────────────────────────────────────────────────
function PodiumCard({ row, rank, teamSlug }: { row: StandingRow; rank: 1 | 2 | 3; teamSlug?: string }) {
  const configs = {
    1: { label: '1ER', glow: '#FFDF73', border: 'border-[#FFDF73]/50', bg: 'from-[#FFDF73]/20 via-[#B8860B]/5 to-transparent', size: 'w-16 h-16', textSize: 'text-3xl' },
    2: { label: '2E', glow: 'var(--color-text-secondary, #E2E8F0)', border: 'border-slate-300/50', bg: 'from-slate-300/20 via-slate-500/5 to-transparent', size: 'w-12 h-12', textSize: 'text-xl' },
    3: { label: '3E', glow: '#D97706', border: 'border-amber-600/50', bg: 'from-amber-600/20 via-amber-800/5 to-transparent', size: 'w-12 h-12', textSize: 'text-xl' },
  }
  const c = configs[rank]

  return (
    <Link to={`/teams/${teamSlug || row.team_id}`}
      className={clsx(
        "relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-2 group overflow-hidden",
        c.border
      )}>
      {/* Background radial glow */}
      <div className="absolute inset-0 opacity-40 pointer-events-none"
           style={{ background: `radial-gradient(circle at center 20%, ${c.glow}40 0%, transparent 70%)` }} />
      <div className={`absolute inset-0 bg-gradient-to-b ${c.bg} pointer-events-none`} />

      {/* Rank Label */}
      <div className="absolute top-0 left-0 bg-black/60 px-2 py-1 rounded-br-lg border-b border-r border-white/10 z-10">
        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: c.glow }}>{c.label}</span>
      </div>

      <div className={clsx('relative rounded-xl flex items-center justify-center text-white font-black shadow-2xl z-10 ring-2 ring-black/50', c.size, c.textSize)}
        style={{ backgroundColor: row.team_color }}>
        {row.team_logo
          ? <img src={row.team_logo} alt="" className="w-3/4 h-3/4 object-contain drop-shadow-md" />
          : row.team_name[0]
        }
      </div>
      
      <div className="text-center relative z-10 w-full mt-1">
        <p className="text-sm font-black text-white truncate uppercase tracking-wider w-full" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {row.team_name}
        </p>
        <div className="flex items-baseline justify-center gap-1 mt-1">
          <span className="text-3xl font-black tabular-nums leading-none" style={{ color: c.glow, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {row.points}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">pts</span>
        </div>
      </div>
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function StandingsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)
  const { data: matches } = useMatches(season?.id)
  const { data: teams } = useTeams(season?.id)
  const { myTeamId } = useMyTeam(season?.id)
  const [filter, setFilter] = useState<FilterType>('all')

  useRealtimeMatches(season?.id)
  useRealtimeTeams(season?.id)

  const filteredStandings = computeFilteredStandings(standings, matches, filter)
  const isLoading = seasonLoading || standingsLoading

  return (
    <div className="space-y-3">

      <PageHero
        imageUrl="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&q=80&auto=format&fit=crop"
        pattern="lines"
        accentColor="#f59e0b"
        title="Classement"
        subtitle={season?.name}
        icon={<Trophy size={20} className="text-yellow-400" />}
        stats={standings?.length ? [
          { label: 'Leader',  value: standings[0]?.team_name ?? '—' },
          { label: 'Points',  value: standings[0]?.points ?? 0 },
          { label: 'Équipes', value: standings.length },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <SkeletonStandingsTable rows={6} />
      ) : !season ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><Trophy size={20} /></div>
          <p className="text-slate-400">Aucune saison active</p>
        </div></div>
      ) : !standings?.length ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><Trophy size={20} /></div>
          <p className="text-slate-300 font-medium">Classement indisponible</p>
          <p className="text-slate-500 text-sm">Disponible après les premiers matchs.</p>
        </div></div>
      ) : (
        <div className="space-y-3">

          {/* Podium top 3 — visible si au moins 3 équipes */}
          {filter === 'all' && standings.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 animate-fade-in-up">
              <PodiumCard row={standings[1]} rank={2} teamSlug={teams?.find(t => t.id === standings[1].team_id)?.slug ?? undefined} />
              <PodiumCard row={standings[0]} rank={1} teamSlug={teams?.find(t => t.id === standings[0].team_id)?.slug ?? undefined} />
              <PodiumCard row={standings[2]} rank={3} teamSlug={teams?.find(t => t.id === standings[2].team_id)?.slug ?? undefined} />
            </div>
          )}

          {/* Table card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/6 bg-slate-50 dark:bg-[#161c2d]">

            {/* Filter tabs */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-white/6">
              <div className="flex items-center gap-1">
                {(['all', 'home', 'away'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      'px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200',
                      filter === f
                        ? 'bg-white/8 text-white border border-white/10'
                        : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    )}
                  >
                    {f === 'all' ? 'Général' : f === 'home' ? 'Domicile' : 'Extérieur'}
                  </button>
                ))}
              </div>
              {/* Export CSV */}
              {filteredStandings && filteredStandings.length > 0 && (
                <button
                  onClick={() => exportCSV(
                    filteredStandings.map((r, i) => ({
                      Rang: i + 1,
                      Équipe: r.team_name,
                      J: r.played,
                      V: r.won,
                      N: r.drawn,
                      D: r.lost,
                      BP: r.goals_for,
                      BC: r.goals_against,
                      Diff: r.goal_diff,
                      Pts: r.points,
                    })),
                    `classement-${season?.name ?? 'saison'}`
                  )}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors"
                  title="Exporter en CSV"
                >
                  <Download size={12} />
                  <span className="hidden sm:block">CSV</span>
                </button>
              )}
            </div>

            {/* Table header — desktop uniquement */}
            <div className="hidden lg:grid grid-cols-[2.5rem_1fr_2rem_repeat(3,2rem)_3rem_3rem_6.5rem_3rem] gap-1 px-4 py-2 border-b border-white/4">
              <span className="section-title text-center">#</span>
              <span className="section-title">Équipe</span>
              <span className="section-title text-center">J</span>
              <span className="section-title text-center text-win/80 font-black">V</span>
              <span className="section-title text-center">N</span>
              <span className="section-title text-center text-loss/80 font-black">D</span>
              <span className="section-title text-center">+/-</span>
              <span className="section-title text-center">BP</span>
              <span className="section-title text-center">Forme</span>
              <span className="section-title text-right">Pts</span>
            </div>
            {/* Mobile header */}
            <div className="grid grid-cols-[2rem_1fr_2rem_4rem_3rem] gap-1 px-3 py-2 border-b border-white/4 lg:hidden">
              <span className="section-title text-center">#</span>
              <span className="section-title">Équipe</span>
              <span className="section-title text-center">J</span>
              <span className="section-title text-center">Forme</span>
              <span className="section-title text-right">Pts</span>
            </div>

            {/* Rows */}
            <div className="stagger-fast">
              {(filteredStandings ?? []).map((row: StandingRow, i: number) => {
                const isFirst  = i === 0
                const isLast   = i === (filteredStandings?.length ?? 0) - 1
                const isMyTeam = row.team_id === myTeamId

                return (
                  <Link
                    key={row.team_id}
                    to={`/teams/${teams?.find(t => t.id === row.team_id)?.slug || row.team_id}`}
                    className={clsx(
                      'border-b border-white/4 last:border-b-0 transition-colors duration-150',
                      'hover:bg-white/3 group',
                      isFirst && 'bg-yellow-500/3',
                      isMyTeam && 'bg-primary-600/5 border-l-2 border-l-primary-500/50'
                    )}
                  >
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[2.5rem_1fr_2rem_repeat(3,2rem)_3rem_3rem_6.5rem_3rem] gap-1 items-center px-4 py-2.5">
                      <div className="flex justify-center">
                        <span className={clsx(
                          'w-7 h-7 flex items-center justify-center text-[13px] font-black',
                          isFirst ? 'bg-[#FFDF73] text-black rounded shadow-[0_0_10px_rgba(255,223,115,0.5)]' :
                          i === 1 ? 'bg-slate-300 text-black rounded' :
                          i === 2 ? 'bg-amber-600 text-white rounded' :
                          'text-slate-500 tabular-nums'
                        )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 border border-white/10 shadow-lg"
                          style={{ backgroundColor: row.team_color }}>
                          {row.team_logo
                            ? <img src={row.team_logo} alt="" className="w-6 h-6 object-contain" />
                            : row.team_name[0]
                          }
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={clsx('text-[15px] font-black uppercase tracking-wider truncate group-hover:text-white transition-colors', isFirst ? 'text-white' : 'text-slate-200')}
                                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                            {row.team_name}
                          </span>
                          {isMyTeam && (
                            <span className="text-[9px] font-bold text-primary-400 uppercase tracking-widest mt-0.5">
                              Mon équipe
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-center text-xs text-slate-400 font-bold tabular-nums">{row.played}</span>
                      <span className="text-center text-xs font-black text-win tabular-nums bg-win/10 rounded py-0.5">{row.won}</span>
                      <span className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{row.drawn}</span>
                      <span className="text-center text-xs font-black text-loss tabular-nums bg-loss/10 rounded py-0.5">{row.lost}</span>
                      <span className={clsx('text-center text-sm font-black tabular-nums', row.goal_diff > 0 ? 'text-win' : row.goal_diff < 0 ? 'text-loss' : 'text-slate-500')}
                            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                      </span>
                      <span className="text-center text-[11px] font-bold text-slate-500 tabular-nums tracking-widest">{row.goals_for}:{row.goals_against}</span>
                      <div className="flex items-center gap-1 justify-center">
                        {row.form.length === 0
                          ? <span className="text-xs text-slate-700">—</span>
                          : row.form.slice(-5).map((r, idx) => <FormBadge key={idx} result={r} />)
                        }
                      </div>
                      <div className="text-right flex items-center justify-end">
                        <span className={clsx(
                          'text-2xl font-black tabular-nums px-2 rounded-lg',
                          isFirst ? 'text-[#FFDF73]' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-500' : 'text-white'
                        )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {row.points}
                        </span>
                      </div>
                    </div>

                    {/* Mobile row — condensé */}
                    <div className="lg:hidden grid grid-cols-[2rem_1fr_2rem_4rem_3rem] gap-1 items-center px-3 py-3 relative overflow-hidden">
                      {isFirst && <div className="absolute inset-0 bg-gradient-to-r from-[#FFDF73]/10 to-transparent pointer-events-none" />}
                      <div className="flex justify-center relative z-10">
                        <span className={clsx(
                          'w-6 h-6 flex items-center justify-center text-[12px] font-black',
                          isFirst ? 'bg-[#FFDF73] text-black rounded shadow-[0_0_10px_rgba(255,223,115,0.5)]' :
                          i === 1 ? 'bg-slate-300 text-black rounded' :
                          i === 2 ? 'bg-amber-600 text-white rounded' :
                          'text-slate-500 tabular-nums'
                        )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                        <div className="w-7 h-7 rounded flex items-center justify-center text-white text-[9px] font-black shrink-0 border border-white/10"
                          style={{ backgroundColor: row.team_color }}>
                          {row.team_logo
                            ? <img src={row.team_logo} alt="" className="w-5 h-5 object-contain" />
                            : row.team_name[0]
                          }
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={clsx('text-[13px] font-black uppercase tracking-wide truncate', isFirst ? 'text-white' : 'text-slate-200')}
                                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                            {row.team_name}
                          </span>
                          {isMyTeam && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0 mt-0.5 shadow-[0_0_5px_rgba(56,189,248,0.8)]" />
                          )}
                        </div>
                      </div>
                      <span className="text-center text-[11px] font-bold text-slate-400 tabular-nums relative z-10">{row.played}</span>
                      <div className="flex items-center gap-0.5 justify-center relative z-10">
                        {row.form.length === 0
                          ? <span className="text-[10px] text-slate-700">—</span>
                          : row.form.slice(-3).map((r, idx) => <FormBadge key={idx} result={r} />)
                        }
                      </div>
                      <div className="text-right flex justify-end relative z-10">
                        <span className={clsx(
                          'text-xl font-black tabular-nums',
                          isFirst ? 'text-[#FFDF73]' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-500' : 'text-white'
                        )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {row.points}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-3 border-t border-white/4">
              {(['W', 'D', 'L'] as const).map(r => (
                <div key={r} className="flex items-center gap-1.5">
                  <FormBadge result={r} />
                  <span className="text-xs text-slate-700">
                    {r === 'W' ? 'Victoire' : r === 'D' ? 'Nul' : 'Défaite'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Graphique d'évolution */}
          {matches && standings.length >= 2 && (
            <FormChart standings={standings} matches={matches} />
          )}
        </div>
      )}
    </div>
  )
}
