import { motion } from 'framer-motion'
import { useMatches } from '@/hooks/useMatches'
import { clsx } from 'clsx'

export function LiveTicker() {
  const { data: matches } = useMatches()
  
  if (!matches || matches.length === 0) return null

  // On prend les matchs terminés récents et les matchs à venir
  const tickerItems = matches
    .filter(m => m.status === 'completed' || m.status === 'scheduled')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-black/80 backdrop-blur-md border-t border-white/10 h-8 flex items-center overflow-hidden">
      <div className="flex items-center h-full px-4 bg-[#C8F135] text-black text-[10px] font-black uppercase tracking-widest skew-x-[-20deg] ml-[-10px] pr-6 z-10">
        <span className="skew-x-[20deg]">DIRECT</span>
      </div>

      <div className="relative flex-1 overflow-hidden h-full flex items-center">
        <motion.div 
          animate={{ x: [0, -2000] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex items-center gap-12 whitespace-nowrap px-8"
        >
          {tickerItems.map((m, i) => (
            <div key={i} className="flex items-center gap-4 group cursor-default">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {m.status === 'completed' ? 'Résultat' : 'À Venir'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-white uppercase">{m.home_team?.name}</span>
                <div className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-black text-[#C8F135] tabular-nums">
                  {m.status === 'completed' ? `${m.home_score} - ${m.away_score}` : 'VS'}
                </div>
                <span className="text-[11px] font-black text-white uppercase">{m.away_team?.name}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
            </div>
          ))}
          {/* Doubler pour l'effet de boucle infinie sans saut */}
          {tickerItems.map((m, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-4 group cursor-default">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {m.status === 'completed' ? 'Résultat' : 'À Venir'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-white uppercase">{m.home_team?.name}</span>
                <div className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-black text-[#C8F135] tabular-nums">
                  {m.status === 'completed' ? `${m.home_score} - ${m.away_score}` : 'VS'}
                </div>
                <span className="text-[11px] font-black text-white uppercase">{m.away_team?.name}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
