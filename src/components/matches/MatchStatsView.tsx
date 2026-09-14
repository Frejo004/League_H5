import { BarChart2 } from 'lucide-react'
import type { TeamRef } from '@/types/database'

export interface MatchStatsData {
  home: { shots: number; shotsOnTarget: number; fouls: number; corners: number };
  away: { shots: number; shotsOnTarget: number; fouls: number; corners: number };
}

export function MatchStatsView({ home, away, stats }: { home: TeamRef, away: TeamRef, stats: MatchStatsData }) {
  const rows = [
    { label: 'Tirs Totaux', home: stats.home.shots, away: stats.away.shots },
    { label: 'Tirs Cadrés', home: stats.home.shotsOnTarget, away: stats.away.shotsOnTarget },
    { label: 'Corners', home: stats.home.corners, away: stats.away.corners },
    { label: 'Fautes', home: stats.home.fouls, away: stats.away.fouls },
  ]

  return (
    <div className="card border-surface-border/50 bg-surface-card/40 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <BarChart2 size={16} className="text-[#C8F135]" />
          Statistiques du Match
        </h3>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Temps Réel</span>
      </div>

      <div className="space-y-6">
        {rows.map((row, i) => {
          const total = row.home + row.away
          const homePct = total === 0 ? 50 : (row.home / total) * 100
          const awayPct = total === 0 ? 50 : (row.away / total) * 100

          return (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <span className="text-lg font-black text-text-primary tabular-nums">{row.home}</span>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{row.label}</span>
                <span className="text-lg font-black text-text-primary tabular-nums">{row.away}</span>
              </div>
              <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-surface-muted gap-0.5">
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
