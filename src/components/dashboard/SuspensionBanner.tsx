import { Ban } from 'lucide-react'
import { useMyActiveSuspension } from '@/hooks/useDisciplinaryStats'

// ── Bannière suspension active ────────────────────────────────────────────────
export function SuspensionBanner({ userId, seasonId }: { userId: string; seasonId: string }) {
  const { data: suspension } = useMyActiveSuspension(userId, seasonId)
  if (!suspension) return null

  const remaining = suspension.matches_count - suspension.matches_served
  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/50 bg-red-500/8 p-4 animate-in fade-in duration-500">
      {/* Barre top animée */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, transparent 60%)' }} />
      <div className="relative flex items-start gap-4">
        {/* Icône */}
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
          <Ban size={18} className="text-red-400" />
        </div>
        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-red-400 uppercase tracking-wider">
              ⚠️ Tu es suspendu
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
              {remaining} match{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-red-300/80 mt-1 font-medium">
            <span className="font-bold text-red-300">Motif :</span> {suspension.reason}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-red-500/20 border border-red-500/20 overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-700 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                style={{ width: `${(suspension.matches_served / suspension.matches_count) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-red-400 tabular-nums">
              {suspension.matches_served} / {suspension.matches_count}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
