import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings } from '@/hooks/useStandings'
import { useMatches } from '@/hooks/useMatches'
import { useRealtimeMatches } from '@/hooks/useRealtime'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonStandingsTable } from '@/components/ui/SkeletonLoader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { StandingRow } from '@/hooks/useStandings'

// ── Form badge — style Sofascore ─────────────────────────────────────────────
function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded text-white text-[9px] font-bold shrink-0',
      result === 'W' && 'bg-green-600',
      result === 'D' && 'bg-slate-500',
      result === 'L' && 'bg-red-600',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}

// ── Rank badge — numéro coloré style Sofascore ───────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-500 text-black',
    2: 'bg-slate-400 text-black',
    3: 'bg-amber-600 text-white',
  }
  const cls = colors[rank] ?? 'bg-surface-raised text-slate-400'
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums',
      cls
    )}>
      {rank}
    </span>
  )
}

type FilterType = 'all' | 'home' | 'away'

// ── Compute home/away sub-standings from matches (pure function, no hook) ─────
function computeFilteredStandings(
  standings: StandingRow[] | undefined,
  matches: import('@/hooks/useMatches').MatchWithTeams[] | undefined,
  filter: FilterType
): StandingRow[] | undefined {
  if (filter === 'all' || !matches || !standings) return standings

  // Rebuild stats from matches filtered by home/away
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
      s.played++
      s.goals_for += gf
      s.goals_against += ga
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
      return {
        ...row,
        ...s,
        goal_diff: s.goals_for - s.goals_against,
      }
    })
    .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for)
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function StandingsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: standings, isLoading: standingsLoading } = useStandings(season?.id)
  const { data: matches } = useMatches(season?.id)
  const [filter, setFilter] = useState<FilterType>('all')

  // Abonnement Realtime — classement mis à jour en direct
  useRealtimeMatches(season?.id)

  // Calcul pur — réutilise les matches déjà chargés, pas de fetch supplémentaire
  const filteredStandings = computeFilteredStandings(standings, matches, filter)
  const isLoading = seasonLoading || standingsLoading

  return (
    <div className="space-y-3">

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1551958219-acbc595d9e47?w=1200&q=80&auto=format&fit=crop"
        pattern="lines"
        accentColor="#f59e0b"
        title="Classement"
        subtitle={season?.name}
        icon={<Trophy size={20} className="text-yellow-400" />}
        stats={standings?.length ? [
          { label: 'Leader',   value: standings[0]?.team_name ?? '—' },
          { label: 'Points',   value: standings[0]?.points ?? 0 },
          { label: 'Équipes',  value: standings.length },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="space-y-2 animate-fade-in">
          <SkeletonStandingsTable rows={6} />
        </div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !standings?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={20} /></div>
            <p className="text-slate-300 font-medium">Classement indisponible</p>
            <p className="text-slate-500 text-sm">Disponible après les premiers matchs.</p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">

          {/* Filter tabs — Tout / Domicile / Extérieur */}
          <div className="flex items-center justify-center gap-1 px-4 py-3 border-b border-surface-border">
            {(['all', 'home', 'away'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
                  filter === f
                    ? 'bg-surface-muted text-white'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {f === 'all' ? 'Tout' : f === 'home' ? 'Domicile' : 'Extérieur'}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border/60">
                  <th className="w-10 px-3 py-2 text-left">
                    <span className="section-title">#</span>
                  </th>
                  <th className="px-2 py-2 text-left min-w-[140px]">
                    <span className="section-title">Équipe</span>
                  </th>
                  <th className="px-2 py-2 text-center w-8">
                    <span className="section-title">P</span>
                  </th>
                  <th className="px-2 py-2 text-center w-8 hidden sm:table-cell">
                    <span className="section-title text-green-500/80">W</span>
                  </th>
                  <th className="px-2 py-2 text-center w-8 hidden sm:table-cell">
                    <span className="section-title">D</span>
                  </th>
                  <th className="px-2 py-2 text-center w-8 hidden sm:table-cell">
                    <span className="section-title text-red-500/80">L</span>
                  </th>
                  <th className="px-2 py-2 text-center w-12 hidden md:table-cell">
                    <span className="section-title">DIFF</span>
                  </th>
                  <th className="px-2 py-2 text-center w-12 hidden md:table-cell">
                    <span className="section-title">GLS</span>
                  </th>
                  <th className="px-2 py-2 text-center hidden lg:table-cell">
                    <span className="section-title">5 derniers</span>
                  </th>
                  <th className="px-3 py-2 text-right w-12">
                    <span className="section-title">PTS</span>
                  </th>
                </tr>
              </thead>
              <tbody className="stagger-fast">
                {(filteredStandings ?? []).map((row: StandingRow, i: number) => (
                  <tr
                    key={row.team_id}
                    className={clsx(
                      'border-b border-surface-border/30 hover:bg-surface-raised transition-colors',
                      i === (filteredStandings?.length ?? 0) - 1 && 'border-b-0'
                    )}
                  >
                    {/* Rank */}
                    <td className="px-3 py-2.5">
                      <RankBadge rank={i + 1} />
                    </td>

                    {/* Team */}
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {/* Color swatch as "logo" */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center
                                     text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: row.team_color }}
                        >
                          {row.team_name[0]}
                        </div>
                        <span className={clsx(
                          'font-semibold truncate',
                          i === 0 ? 'text-white' : 'text-slate-200'
                        )}>
                          {row.team_name}
                        </span>
                      </div>
                    </td>

                    {/* Played */}
                    <td className="px-2 py-2.5 text-center text-slate-400 tabular-nums text-xs">
                      {row.played}
                    </td>

                    {/* W D L */}
                    <td className="px-2 py-2.5 text-center tabular-nums text-xs hidden sm:table-cell">
                      <span className="text-green-400 font-semibold">{row.won}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-xs text-slate-500 hidden sm:table-cell">
                      {row.drawn}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-xs hidden sm:table-cell">
                      <span className="text-red-400 font-semibold">{row.lost}</span>
                    </td>

                    {/* DIFF */}
                    <td className="px-2 py-2.5 text-center tabular-nums text-xs hidden md:table-cell">
                      <span className={clsx(
                        'font-semibold',
                        row.goal_diff > 0 ? 'text-green-400' :
                        row.goal_diff < 0 ? 'text-red-400' : 'text-slate-500'
                      )}>
                        {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                      </span>
                    </td>

                    {/* GLS — buts pour : buts contre */}
                    <td className="px-2 py-2.5 text-center tabular-nums text-xs text-slate-400 hidden md:table-cell">
                      {row.goals_for}:{row.goals_against}
                    </td>

                    {/* Form — 5 derniers */}
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <div className="flex items-center gap-0.5">
                        {row.form.length === 0 ? (
                          <span className="text-xs text-slate-700">—</span>
                        ) : (
                          row.form.slice(-5).map((r, idx) => (
                            <FormBadge key={idx} result={r} />
                          ))
                        )}
                      </div>
                    </td>

                    {/* Points */}
                    <td className="px-3 py-2.5 text-right">
                      <span className={clsx(
                        'text-base font-bold tabular-nums',
                        i === 0 ? 'text-yellow-400' :
                        i === 1 ? 'text-slate-300' :
                        i === 2 ? 'text-amber-600' : 'text-white'
                      )}>
                        {row.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-surface-border/40">
            <div className="flex items-center gap-1.5">
              <FormBadge result="W" />
              <span className="text-xs text-slate-600">Victoire</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FormBadge result="D" />
              <span className="text-xs text-slate-600">Nul</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FormBadge result="L" />
              <span className="text-xs text-slate-600">Défaite</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
