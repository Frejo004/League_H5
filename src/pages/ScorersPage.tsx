import { Target } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useScorers } from '@/hooks/useScorers'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonRow, SkeletonLine } from '@/components/ui/SkeletonLoader'
import { clsx } from 'clsx'

export function ScorersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: scorers, isLoading: scorersLoading } = useScorers(season?.id)

  useRealtimeMatches(season?.id)
  useRealtimeTeams(season?.id)

  const isLoading = seasonLoading || scorersLoading
  const topScorer = scorers?.[0]

  return (
    <div className="space-y-3">

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=1200&q=80&auto=format&fit=crop"
        pattern="hexagon"
        accentColor="#f97316"
        title="Buteurs"
        subtitle={season?.name}
        icon={<Target size={20} className="text-orange-400" />}
        stats={topScorer ? [
          { label: 'Meilleur buteur', value: `${topScorer.first_name} ${topScorer.last_name}` },
          { label: 'Buts',            value: topScorer.goals },
          { label: 'Classés',         value: scorers?.filter(s => s.goals > 0).length ?? 0 },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="card p-0 overflow-hidden animate-fade-in">
          <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 px-4 py-2 border-b border-surface-border">
            {['w-4', 'w-1/3', 'w-8', 'w-8'].map((w, i) => (
              <SkeletonLine key={i} width={w} height="h-2" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
        </div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Target size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !scorers?.filter(s => s.goals > 0).length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Target size={20} /></div>
            <p className="text-slate-300 font-medium">Aucune statistique</p>
            <p className="text-slate-500 text-sm">Disponible après les premiers matchs.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header style broadcast */}
          <div className="hidden sm:grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 px-6 py-2 bg-black/40 rounded-t-2xl border-b border-white/5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Rang</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Joueur</span>
            <span className="text-[10px] font-black text-[#FFDF73] uppercase tracking-widest text-center">Buts</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">Passes</span>
          </div>

          <div className="flex flex-col gap-1.5 sm:gap-2 stagger-fast">
            {scorers?.filter(s => s.goals > 0).map((row, i) => (
              <div
                key={row.player_id}
                className={clsx(
                  'grid grid-cols-[2.5rem_1fr_3rem_3rem] sm:grid-cols-[3rem_1fr_4rem_4rem] gap-2 items-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden',
                  i === 0 ? 'glass-morphism border border-[#FFDF73]/40 shadow-[0_4px_20px_rgba(255,223,115,0.15)] bg-gradient-to-r from-[#FFDF73]/10 to-transparent' :
                  i === 1 ? 'glass-morphism border border-slate-300/40 bg-gradient-to-r from-slate-300/10 to-transparent' :
                  i === 2 ? 'glass-morphism border border-amber-600/40 bg-gradient-to-r from-amber-600/10 to-transparent' :
                  'glass-morphism border border-white/5 hover:border-white/20'
                )}
              >
                {/* Glow de fond pour le top 1 */}
                {i === 0 && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-[#FFDF73]/20 to-transparent pointer-events-none opacity-50" />}
                
                {/* Rank */}
                <div className="flex justify-center relative z-10">
                  <span className={clsx(
                    'w-8 h-8 flex items-center justify-center text-sm font-black rounded shadow-lg',
                    i === 0 ? 'bg-[#FFDF73] text-black shadow-[0_0_15px_rgba(255,223,115,0.6)]' : 
                    i === 1 ? 'bg-slate-300 text-black shadow-[0_0_10px_rgba(203,213,225,0.4)]' : 
                    i === 2 ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)]' : 
                    'text-slate-500 tabular-nums bg-surface-raised border border-white/10'
                  )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {i + 1}
                  </span>
                </div>

                {/* Player */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 relative z-10">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-black shrink-0 border-2 shadow-lg"
                    style={{ backgroundColor: row.team_color, borderColor: i === 0 ? '#FFDF73' : 'rgba(255,255,255,0.1)' }}
                  >
                    {row.first_name[0]}{row.last_name[0]}
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <p className={clsx(
                      "text-base sm:text-lg font-black uppercase tracking-wider truncate",
                      i === 0 ? 'text-white text-glow-sm' : 'text-slate-200 group-hover:text-white'
                    )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {row.first_name} {row.last_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: row.team_color }} />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{row.team_name}</span>
                    </div>
                  </div>
                </div>

                {/* Goals */}
                <div className="flex justify-center relative z-10">
                  <span className={clsx(
                    'text-2xl sm:text-3xl font-black tabular-nums drop-shadow-lg',
                    i === 0 ? 'text-[#FFDF73] text-glow' : 'text-white'
                  )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {row.goals}
                  </span>
                </div>

                {/* Assists */}
                <div className="flex justify-center relative z-10">
                  <span className={clsx(
                    'text-lg sm:text-xl font-bold tabular-nums drop-shadow-md',
                    row.assists > 0 ? 'text-emerald-400' : 'text-slate-600'
                  )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {row.assists || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
