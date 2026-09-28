import { Shield, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMemo } from 'react'
import { useStandings } from '@/hooks/useStandings'

// ── Carte Mon Équipe (Joueur / Capitaine) ─────────────────────────────────────
export function MyTeamCard({ teamId, seasonId }: { teamId: string; seasonId: string }) {
  const { data: standings } = useStandings(seasonId)
  const myStanding = useMemo(() => standings?.find(s => s.team_id === teamId), [standings, teamId])
  const rank = useMemo(() => {
    if (!standings) return null
    return standings.findIndex(s => s.team_id === teamId) + 1
  }, [standings, teamId])

  if (!myStanding) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${myStanding.team_color}10 0%, transparent 70%)` }} />
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-text-muted" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Mon équipe</span>
        </div>
        <Link to={`/teams/${myStanding.team_id}`}
          className="text-[10px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors">
          Page d'équipe <ChevronRight size={10} />
        </Link>
      </div>

      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
            style={{ backgroundColor: myStanding.team_color }}>
            {myStanding.team_logo ? <img src={myStanding.team_logo} alt="" className="w-10 h-10 object-contain rounded-lg" /> : myStanding.team_name[0]}
          </div>
          <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-black border-2 border-surface-card">
            {rank}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-text-primary truncate leading-tight mb-1">{myStanding.team_name}</p>
          <div className="flex items-center gap-1.5">
            {myStanding.form.slice(-3).map((res, i) => (
              <span key={i} className={clsx(
                "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black",
                res === 'W' ? "bg-green-500/20 text-green-400" : res === 'D' ? "bg-slate-500/20 text-slate-400" : "bg-red-500/20 text-red-400"
              )}>
                {res}
              </span>
            ))}
            <span className="text-[10px] text-text-muted font-bold ml-1 uppercase tracking-wider">Forme</span>
          </div>
        </div>
      </div>
    </div>
  )
}
