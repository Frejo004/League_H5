import { useState } from 'react'
import { Trophy, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { useMatches } from '@/hooks/useMatches'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonStandingsTable } from '@/components/ui/SkeletonLoader'
import { clsx } from 'clsx'
import type { StandingRow } from '@/hooks/useStandings'

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded-md text-white text-[9px] font-black shrink-0',
      result === 'W' && 'bg-green-500/80',
      result === 'D' && 'bg-slate-600',
      result === 'L' && 'bg-red-500/80',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}

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
    1: { emoji: '🥇', glow: '#f59e0b', size: 'w-14 h-14', textSize: 'text-2xl', pts: 'text-yellow-400' },
    2: { emoji: '🥈', glow: '#94a3b8', size: 'w-12 h-12', textSize: 'text-xl',  pts: 'text-slate-300' },
    3: { emoji: '🥉', glow: '#b45309', size: 'w-12 h-12', textSize: 'text-xl',  pts: 'text-amber-600' },
  }
  const c = configs[rank]

  return (
    <Link to={`/teams/${row.team_id}`}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-white/6 hover:border-white/12 transition-all duration-200 hover:-translate-y-1 group"
      style={{ background: `linear-gradient(135deg, ${c.glow}10 0%, #111827 70%)` }}>
      <span className="text-lg">{c.emoji}</span>
      <div className={clsx('rounded-2xl flex items-center justify-center text-white font-black shadow-lg', c.size, c.textSize)}
        style={{ backgroundColor: row.team_color }}>
        {row.team_logo
          ? <img src={row.team_logo} alt="" className="w-10 h-10 object-contain rounded-xl" />
          : row.team_name[0]
        }
      </div>
      <p className="text-xs font-bold text-white text-center truncate w-full">{row.team_name}</p>
      <p className={clsx('text-xl font-black tabular-nums', c.pts)}>{row.points}</p>
      <p className="text-[10px] text-slate-600">pts</p>
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function StandingsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)
  const { data: matches } = useMatches(season?.id)
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
            <div className="flex items-center gap-1 px-3 py-3 border-b border-white/6">
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

            {/* Table header */}
            <div className="grid grid-cols-[2.5rem_1fr_2rem_repeat(3,2rem)_3rem_3rem_auto_3rem] gap-1 px-4 py-2 border-b border-white/4">
              <span className="section-title text-center">#</span>
              <span className="section-title">Équipe</span>
              <span className="section-title text-center">J</span>
              <span className="section-title text-center text-green-500/70 hidden sm:block">V</span>
              <span className="section-title text-center hidden sm:block">N</span>
              <span className="section-title text-center text-red-500/70 hidden sm:block">D</span>
              <span className="section-title text-center hidden md:block">+/-</span>
              <span className="section-title text-center hidden md:block">BU</span>
              <span className="section-title text-center hidden lg:block">Forme</span>
              <span className="section-title text-right">Pts</span>
            </div>

            {/* Rows */}
            <div className="stagger-fast">
              {(filteredStandings ?? []).map((row: StandingRow, i: number) => {
                const isFirst  = i === 0
                const isLast   = i === (filteredStandings?.length ?? 0) - 1

                return (
                  <Link
                    key={row.team_id}
                    to={`/teams/${row.team_id}`}
                    className={clsx(
                      'grid grid-cols-[2.5rem_1fr_2rem_repeat(3,2rem)_3rem_3rem_auto_3rem] gap-1 items-center px-4 py-3',
                      'border-b border-white/4 last:border-b-0 transition-colors duration-150',
                      'hover:bg-white/3 group',
                      isFirst && 'bg-yellow-500/3'
                    )}
                  >
                    {/* Rank */}
                    <div className="flex justify-center">
                      {i < 3 ? (
                        <span className={clsx(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black',
                          i === 0 && 'bg-yellow-500/20 text-yellow-400',
                          i === 1 && 'bg-slate-500/20 text-slate-300',
                          i === 2 && 'bg-amber-700/20 text-amber-600',
                        )}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 font-bold tabular-nums">{i + 1}</span>
                      )}
                    </div>

                    {/* Team */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ backgroundColor: row.team_color }}>
                        {row.team_logo
                          ? <img src={row.team_logo} alt="" className="w-6 h-6 object-contain rounded-md" />
                          : row.team_name[0]
                        }
                      </div>
                      <span className={clsx(
                        'text-sm font-semibold truncate group-hover:text-white transition-colors',
                        isFirst ? 'text-white' : 'text-slate-300'
                      )}>
                        {row.team_name}
                      </span>
                    </div>

                    {/* Played */}
                    <span className="text-center text-xs text-slate-500 tabular-nums">{row.played}</span>

                    {/* W D L */}
                    <span className="text-center text-xs font-semibold text-green-400 tabular-nums hidden sm:block">{row.won}</span>
                    <span className="text-center text-xs text-slate-600 tabular-nums hidden sm:block">{row.drawn}</span>
                    <span className="text-center text-xs font-semibold text-red-400 tabular-nums hidden sm:block">{row.lost}</span>

                    {/* Diff */}
                    <span className={clsx(
                      'text-center text-xs font-bold tabular-nums hidden md:block',
                      row.goal_diff > 0 ? 'text-green-400' : row.goal_diff < 0 ? 'text-red-400' : 'text-slate-600'
                    )}>
                      {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                    </span>

                    {/* Goals */}
                    <span className="text-center text-xs text-slate-500 tabular-nums hidden md:block">
                      {row.goals_for}:{row.goals_against}
                    </span>

                    {/* Form */}
                    <div className="hidden lg:flex items-center gap-0.5 justify-center">
                      {row.form.length === 0
                        ? <span className="text-xs text-slate-700">—</span>
                        : row.form.slice(-5).map((r, idx) => <FormBadge key={idx} result={r} />)
                      }
                    </div>

                    {/* Points */}
                    <span className={clsx(
                      'text-right text-base font-black tabular-nums',
                      i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-white'
                    )}>
                      {row.points}
                    </span>
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
