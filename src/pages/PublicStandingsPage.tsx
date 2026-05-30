import { useMemo } from 'react'
import { Trophy, TrendingUp } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useStandings, type StandingRow } from '@/hooks/useStandings'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { FormBadge } from '@/components/ui/SharedBadges'
import { clsx } from 'clsx'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// ── Podium top 3 (Adaptation pour le mode public) ─────────────────────────────
function PodiumCard({ row, rank }: { row: StandingRow; rank: 1 | 2 | 3 }) {
  const configs = {
    1: { label: '1ER', glow: '#FFDF73', border: 'border-[#FFDF73]/50', bg: 'from-[#FFDF73]/20 via-[#B8860B]/5 to-transparent', size: 'w-16 h-16', textSize: 'text-3xl' },
    2: { label: '2E', glow: '#94a3b8', border: 'border-slate-300/50', bg: 'from-slate-300/20 via-slate-500/5 to-transparent', size: 'w-12 h-12', textSize: 'text-xl' },
    3: { label: '3E', glow: '#D97706', border: 'border-amber-600/50', bg: 'from-amber-600/20 via-amber-800/5 to-transparent', size: 'w-12 h-12', textSize: 'text-xl' },
  }
  const c = configs[rank]

  return (
    <div className={clsx(
        "relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 group overflow-hidden",
        c.border
      )}>
      <div className="absolute inset-0 opacity-40 pointer-events-none"
           style={{ background: `radial-gradient(circle at center 20%, ${c.glow}40 0%, transparent 70%)` }} />
      <div className={`absolute inset-0 bg-gradient-to-b ${c.bg} pointer-events-none`} />

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
        <p className="text-sm font-black text-[var(--t1)] truncate uppercase tracking-wider w-full" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {row.team_name}
        </p>
        <div className="flex items-baseline justify-center gap-1 mt-1">
          <span className="text-xl font-black text-[var(--t1)] italic font-['Barlow_Condensed']">{row.points}</span>
          <span className="text-[9px] font-bold text-[var(--tm)] uppercase tracking-widest">PTS</span>
        </div>
      </div>
    </div>
  )
}

export function PublicStandingsPage() {
  const { data: season } = useActiveSeason()
  const { data: standings, isLoading } = useStandings(season?.id)
  
  // Realtime updates
  useRealtimeTeams(season?.id)
  useRealtimeMatches(season?.id)

  const podium = useMemo(() => {
    if (!standings) return []
    return standings.slice(0, 3)
  }, [standings])

  const tableRows = useMemo(() => {
    if (!standings) return []
    return standings
  }, [standings])

  return (
    <PublicLayout hideFooter>
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Page Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8F135]/10 border border-[#C8F135]/20 mb-3">
              <Trophy size={12} className="text-[#C8F135]" />
              <span className="text-[10px] font-black text-[#C8F135] uppercase tracking-[0.2em]">Classement Officiel</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-[var(--t1)] uppercase italic tracking-tighter leading-none font-['Barlow_Condensed']">
              Tableau de <span className="text-transparent" style={{ WebkitTextStroke: '1px var(--t1)' }}>Saison</span>
            </h1>
            <p className="text-xs text-[var(--tm)] font-bold uppercase tracking-widest mt-2">
              Performance en temps réel des clubs engagés
            </p>
          </div>
        </div>

        {/* Podium Section */}
        {!isLoading && podium.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {podium[1] && <PodiumCard row={podium[1]} rank={2} />}
            {podium[0] && <PodiumCard row={podium[0]} rank={1} />}
            {podium[2] && <PodiumCard row={podium[2]} rank={3} />}
          </div>
        )}

        {/* Standings Table */}
        <div className="card overflow-hidden border border-[var(--bd)] bg-[var(--bg-surface)] shadow-xl rounded-[2rem]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-surface-h)] border-b border-[var(--bd)]">
                  <th className="px-4 py-4 text-left text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">#</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">Équipe</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">J</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--tm)] uppercase tracking-widest hidden sm:table-cell">V</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--tm)] uppercase tracking-widest hidden sm:table-cell">N</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--tm)] uppercase tracking-widest hidden sm:table-cell">D</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">+/-</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">Pts</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">Forme</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <LoadingSpinner size="lg" />
                        <span className="text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">Chargement du classement...</span>
                      </div>
                    </td>
                  </tr>
                ) : !season ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">Aucune saison active</span>
                      </div>
                    </td>
                  </tr>
                ) : !standings?.length ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-black text-[var(--tm)] uppercase tracking-widest">Classement indisponible</span>
                        <span className="text-[9px] font-bold text-[var(--tm)] uppercase tracking-widest">Disponible après les premiers matchs.</span>
                      </div>
                    </td>
                  </tr>
                ) : tableRows.map((row, i) => (
                  <tr 
                    key={row.team_id}
                    className="border-b border-[var(--bd)]/50 hover:bg-[var(--bg-surface-h)] transition-colors group"
                  >
                    <td className="px-4 py-4">
                      <span className={clsx(
                        "text-xs font-black w-6 h-6 rounded-lg flex items-center justify-center font-['Barlow_Condensed']",
                        i === 0 ? "bg-[#FFDF73] text-[#0D1117]" : "text-[var(--tm)]"
                      )}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1.5 shadow-sm" style={{ backgroundColor: row.team_color }}>
                          {row.team_logo 
                            ? <img src={row.team_logo} className="w-full h-full object-contain" alt="" />
                            : <span className="text-[10px] font-black text-white">{row.team_name[0]}</span>
                          }
                        </div>
                        <span className="text-xs font-black text-[var(--t1)] uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
                          {row.team_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-xs font-bold text-[var(--t2)] font-['Barlow_Condensed']">{row.played}</td>
                    <td className="px-4 py-4 text-center text-xs font-bold text-green-500 font-['Barlow_Condensed'] hidden sm:table-cell">{row.won}</td>
                    <td className="px-4 py-4 text-center text-xs font-bold text-amber-500 font-['Barlow_Condensed'] hidden sm:table-cell">{row.drawn}</td>
                    <td className="px-4 py-4 text-center text-xs font-bold text-red-500 font-['Barlow_Condensed'] hidden sm:table-cell">{row.lost}</td>
                    <td className="px-4 py-4 text-center text-xs font-bold text-[var(--t2)] font-['Barlow_Condensed']">
                      {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-black text-[var(--t1)] font-['Barlow_Condensed'] italic">{row.points}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {row.form.map((res, idx) => (
                          <FormBadge key={idx} result={res} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rules Reminder / Legend */}
        <div className="mt-8 p-6 rounded-[2rem] bg-[var(--bg-surface-h)] border border-[var(--bd)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--bd)] flex items-center justify-center text-[var(--tm)]">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--t1)] uppercase tracking-widest mb-1">Système de points</p>
                <div className="flex gap-4">
                  <span className="text-[9px] font-bold text-[var(--tm)] uppercase tracking-widest"><span className="text-green-500">Victoire</span> : 3 pts</span>
                  <span className="text-[9px] font-bold text-[var(--tm)] uppercase tracking-widest"><span className="text-amber-500">Nul</span> : 1 pt</span>
                  <span className="text-[9px] font-bold text-[var(--tm)] uppercase tracking-widest"><span className="text-red-500">Défaite</span> : 0 pt</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-[var(--tm)] font-bold italic uppercase tracking-[0.2em] text-center sm:text-right">
              Classement calculé selon les règlements officiels de la League H5
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
