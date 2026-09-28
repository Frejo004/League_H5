import { Link } from 'react-router-dom'
import { Ban, ChevronRight } from 'lucide-react'
import { useSuspensions } from '@/hooks/useDisciplinaryStats'

// ── Widget suspensions publiques (visible par tous) ──────────────────────────
export function ActiveSuspensionsWidget({ seasonId, isAdmin = false }: { seasonId: string; isAdmin?: boolean }) {
  const { data: suspensions = [], isLoading } = useSuspensions(seasonId)
  const active = suspensions.filter(s => s.is_active)

  if (isLoading || active.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3 animate-in fade-in duration-500">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/50" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ban size={14} className="text-red-400" />
          <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">
            Suspensions en cours
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-red-500 text-white">
            {active.length}
          </span>
        </div>
        {isAdmin && (
          <Link
            to="/admin?tab=sanctions"
            className="text-[10px] font-bold text-red-400/70 hover:text-red-400 flex items-center gap-0.5 transition-colors"
          >
            Gérer <ChevronRight size={10} />
          </Link>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {active.map(s => {
          const remaining = s.matches_count - s.matches_served
          return (
            <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-card/80 border border-red-500/15">
              {/* Avatar initiales */}
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-xs shrink-0">
                {s.player?.first_name?.[0]}{s.player?.last_name?.[0]}
              </div>
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-text-primary truncate">
                    {s.player?.first_name} {s.player?.last_name}
                  </span>
                  {s.player?.team && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0"
                      style={{ backgroundColor: `${s.player.team.color}20`, color: s.player.team.color }}
                    >
                      {s.player.team.name}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-red-300/70 mt-0.5 truncate">{s.reason}</p>
              </div>
              {/* Matchs restants */}
              <div className="text-right shrink-0">
                <span className="text-xs font-black text-red-400 tabular-nums">
                  {remaining}
                </span>
                <p className="text-[9px] text-red-400/60 font-bold uppercase tracking-wider">
                  match{remaining > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
