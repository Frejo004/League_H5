import { useState } from 'react'
import { Trophy, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { useMatches } from '@/hooks/useMatches'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { useMyTeam } from '@/hooks/useMyTeam'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonStandingsTable } from '@/components/ui/SkeletonLoader'
import { exportCSV } from '@/hooks/useExport'
import { FormBadge } from '@/components/ui/SharedBadges'
import { clsx } from 'clsx'
import type { StandingRow } from '@/hooks/useStandings'


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
  }>()

  for (const row of standings) {
    statsMap.set(row.team_id, { played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 })
  }

  for (const m of matches) {
    if (m.status !== 'completed' || m.home_score === null || m.away_score === null) continue
    const processTeam = (teamId: string, gf: number, ga: number) => {
      const s = statsMap.get(teamId)
      if (!s) return
      s.played++; s.goals_for += gf; s.goals_against += ga
      if (gf > ga) { s.won++; s.points += 3 }
      else if (gf === ga) { s.drawn++; s.points += 1 }
      else s.lost++
    }
    if (filter === 'home') processTeam(m.home_team_id, m.home_score, m.away_score)
    if (filter === 'away') processTeam(m.away_team_id, m.away_score, m.home_score)
  }

  return standings
    .map(row => {
      const s = statsMap.get(row.team_id)!
      return { ...row, ...s, goal_diff: s.goals_for - s.goals_against }
    })
    .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for)
}

// ── Podium top 3 ─────────────────────────────────────────────────────────────
function PodiumCard({ row, rank }: { row: StandingRow; rank: 1 | 2 | 3 }) {
  const configs = {
    1: { label: '1ER', glow: '#FFDF73', border: 'border-[#FFDF73]/50', bg: 'from-[#FFDF73]/20 via-[#B8860B]/5 to-transparent', size: 'w-16 h-16', textSize: 'text-3xl' },
    2: { label: '2E', glow: '#E2E8F0', border: 'border-slate-300/50', bg: 'from-slate-300/20 via-slate-500/5 to-transparent', size: 'w-12 h-12', textSize: 'text-xl' },
    3: { label: '3E', glow: '#D97706', border: 'border-amber-600/50', bg: 'from-amber-600/20 via-amber-800/5 to-transparent', size: 'w-12 h-12', textSize: 'text-xl' },
  }
  const c = configs[rank]

  return (
    <Link to={`/teams/${row.team_id}`}
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
          <span className="text-[9px] text-white/50 uppercase font-bold tracking-widest">pts</span>
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
              <PodiumCard row={standings[1]} rank={2} />
              <PodiumCard row={standings[0]} rank={1} />
              <PodiumCard row={standings[2]} rank={3} />
            </div>
          )}

          {/* Table card */}
          <div className="overflow-hidden rounded-2xl border border-white/6"
            style={{ background: 'linear-gradient(135deg, #161c2d 0%, #111827 100%)' }}>

            {/* Filter tabs */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/6">
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
            <div className="hidden lg:grid grid-cols-[2.5rem_1fr_2rem_repeat(3,2rem)_3rem_3rem_auto_3rem] gap-1 px-4 py-2 border-b border-white/4">
              <span className="section-title text-center">#</span>
              <span className="section-title">Équipe</span>
              <span className="section-title text-center">J</span>
              <span className="section-title text-center text-green-500/70">V</span>
              <span className="section-title text-center">N</span>
              <span className="section-title text-center text-red-500/70">D</span>
              <span className="section-title text-center">+/-</span>
              <span className="section-title text-center">BU</span>
              <span className="section-title text-center">Forme</span>
              <span className="section-title text-right">Pts</span>
            </div>
            {/* Mobile header */}
            <div className="grid grid-cols-[2rem_1fr_2rem_auto_3rem] gap-1 px-3 py-2 border-b border-white/4 lg:hidden">
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
                    to={`/teams/${row.team_id}`}
                    className={clsx(
                      'border-b border-white/4 last:border-b-0 transition-colors duration-150',
                      'hover:bg-white/3 group',
                      isFirst && 'bg-yellow-500/3',
                      isMyTeam && 'bg-primary-600/5 border-l-2 border-l-primary-500/50'
                    )}
                  >
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[2.5rem_1fr_2rem_repeat(3,2rem)_3rem_3rem_auto_3rem] gap-1 items-center px-4 py-2.5">
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
                      <span className="text-center text-xs font-black text-emerald-400 tabular-nums bg-emerald-500/10 rounded py-0.5">{row.won}</span>
                      <span className="text-center text-xs font-bold text-slate-500 tabular-nums">{row.drawn}</span>
                      <span className="text-center text-xs font-black text-rose-400 tabular-nums bg-rose-500/10 rounded py-0.5">{row.lost}</span>
                      <span className={clsx('text-center text-sm font-black tabular-nums', row.goal_diff > 0 ? 'text-emerald-400' : row.goal_diff < 0 ? 'text-rose-400' : 'text-slate-500')}
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
                    <div className="lg:hidden grid grid-cols-[2rem_1fr_2rem_auto_2.5rem] gap-2 items-center px-3 py-3 relative overflow-hidden">
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
        </div>
      )}
    </div>
  )
}
