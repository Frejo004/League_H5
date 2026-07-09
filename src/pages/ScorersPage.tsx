import { Target, Ban } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useScorers } from '@/hooks/useScorers'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { useActiveSuspendedPlayerIds } from '@/hooks/useDisciplinaryStats'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonRow, SkeletonLine } from '@/components/ui/SkeletonLoader'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import { clsx } from 'clsx'

export function ScorersPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: scorers, isLoading: scorersLoading } = useScorers(season?.id)
  const { data: suspendedIds } = useActiveSuspendedPlayerIds(season?.id)

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
          <div className="hidden sm:grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 px-6 py-2 bg-surface-card border-b border-surface-border">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">#</span>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-4">Joueur</span>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Buts</span>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Passes</span>
          </div>

          <div className="flex flex-col gap-1.5 sm:gap-2 stagger-fast">
            {scorers?.filter(s => s.goals > 0).map((row, i) => (
              <Link
                key={row.player_id}
                to={`/players/${row.player_slug || row.player_id}`}
                className={clsx(
                  'grid grid-cols-[2.5rem_1fr_3rem_3rem] sm:grid-cols-[3rem_1fr_4rem_4rem] gap-2 items-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden bg-surface-card',
                  i === 0 ? 'border border-[#FFDF73]/40 shadow-[0_4px_20px_rgba(255,223,115,0.15)] bg-gradient-to-r from-[#FFDF73]/10 to-transparent' :
                  i === 1 ? 'border border-slate-300/40 bg-gradient-to-r from-slate-300/10 to-transparent' :
                  i === 2 ? 'border border-amber-600/40 bg-gradient-to-r from-amber-600/10 to-transparent' :
                  'glass-morphism border border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                {/* Glow de fond pour le top 1 */}
                {i === 0 && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-[#FFDF73]/20 to-transparent pointer-events-none opacity-50" />}
                
                {/* Rank */}
                <div className="flex justify-center relative z-10">
                  <span className={clsx(
                    'w-8 h-8 flex items-center justify-center text-sm font-black rounded shadow-lg',
                    i === 0 ? 'bg-[#FFDF73] text-black shadow-[0_0_15px_rgba(255,223,115,0.6)]' :
                    i === 1 ? 'bg-surface-raised text-text-primary shadow-[0_0_10px_rgba(0,0,0,0.4)]' : 
                    i === 2 ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)]' : 
                    'text-text-muted tabular-nums bg-surface-raised border border-surface-border'
                  )}>
                    {i + 1}
                  </span>
                </div>

                {/* Player */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 relative z-10">
                  <PlayerAvatar
                    firstName={row.first_name}
                    lastName={row.last_name}
                    avatarUrl={row.avatar_url}
                    teamColor={row.team_color}
                    size={44}
                    className={clsx(
                      'border-2 shadow-lg',
                      i === 0 ? 'border-[#FFDF73]' : 'border-[var(--color-surface-border)]'
                    )}
                  />
                  <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={clsx(
                        "text-base sm:text-lg font-black uppercase tracking-wider truncate",
                        i === 0 ? 'text-text-primary text-glow-sm' : 'text-text-secondary group-hover:text-text-primary'
                      )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {row.first_name} {row.last_name}
                      </p>
                      {suspendedIds?.has(row.player_id) && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-[9px] font-black text-red-400 uppercase tracking-wider shrink-0">
                          <Ban size={9} />
                          Suspendu
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: row.team_color }} />
                      <span className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-widest truncate">{row.team_name}</span>
                    </div>
                  </div>
                </div>
                {/* Goals */}
                <div className="flex justify-center relative z-10">
                  <span className={clsx(
                    'text-2xl sm:text-3xl font-black tabular-nums drop-shadow-lg',
                    i === 0 ? 'text-[#FFDF73] text-glow' : 'text-text-primary'
                  )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {row.goals}
                  </span>
                </div>

                {/* Assists */}
                <div className="flex justify-center relative z-10">
                  <span className={clsx(
                    'text-lg sm:text-xl font-bold tabular-nums drop-shadow-md text-text-primary',
                    row.assists > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'
                  )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {row.assists || '—'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
