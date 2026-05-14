/**
 * LiveEventFeed — Fil d'événements live en temps réel
 * Buts, cartons, remplacements, commentaires
 */
import { clsx } from 'clsx'
import type { MatchEvent } from '@/types/database'

const EVENT_ICONS: Record<string, string> = {
  goal:         '⚽',
  own_goal:     '⚽',
  yellow_card:  '🟨',
  red_card:     '🟥',
  substitution: '🔄',
  kickoff:      '🏁',
  halftime:     '⏸️',
  fulltime:     '🏆',
  comment:      '💬',
}

const EVENT_LABELS: Record<string, string> = {
  goal:         'But',
  own_goal:     'But contre son camp',
  yellow_card:  'Carton jaune',
  red_card:     'Carton rouge',
  substitution: 'Remplacement',
  kickoff:      'Coup d\'envoi',
  halftime:     'Mi-temps',
  fulltime:     'Fin du match',
  comment:      '',
}

interface LiveEventFeedProps {
  events: MatchEvent[]
  homeTeamId: string
  homeColor: string
  awayColor: string
  className?: string
}

export function LiveEventFeed({
  events, homeTeamId, homeColor, awayColor, className,
}: LiveEventFeedProps) {
  // Trier par minute croissante pour calculer le score cumulé
  const chronological = [...events].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
  
  // Calculer le score à chaque étape
  let homeScore = 0
  let awayScore = 0
  const eventsWithScore = chronological.map(event => {
    if (event.type === 'goal' || event.type === 'own_goal') {
      if (event.team_id === homeTeamId) homeScore++
      else awayScore++
    }
    return { ...event, currentScore: `${homeScore}-${awayScore}` }
  })

  // Inverser pour l'affichage (plus récent en haut)
  const sorted = eventsWithScore.reverse()

  if (events.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-12 gap-3 opacity-50', className)}>
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
          <span className="animate-pulse">⏳</span>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">En attente d'actions...</p>
      </div>
    )
  }

  return (
    <div className={clsx('relative py-4 max-w-2xl mx-auto', className)}>
      {/* Ligne centrale */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 transform -translate-x-1/2" />

      <div className="space-y-6 relative">
        {sorted.map((event, idx) => {
          const isHome = event.team_id === homeTeamId
          const isSystem = ['kickoff', 'halftime', 'fulltime'].includes(event.type)
          
          const playerName = event.player ? `${event.player.first_name} ${event.player.last_name}` : null
          const player2Name = event.player2 ? `${event.player2.first_name} ${event.player2.last_name}` : null

          return (
            <div key={event.id} className="relative flex items-center justify-center min-h-[40px]">
              
              {/* Côté Gauche (Home) */}
              <div className="flex-1 flex justify-end pr-8">
                {isHome && !isSystem && (
                  <div className="flex flex-col items-end text-right">
                    <div className="flex items-center gap-3">
                      {(event.type === 'goal' || event.type === 'own_goal') && (
                         <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-black text-white shadow-lg">
                           {event.currentScore}
                         </span>
                      )}
                      <span className="text-xs font-black text-white uppercase tracking-tight">{playerName}</span>
                      <span className="text-[10px] font-bold text-slate-500">{event.minute}'</span>
                    </div>
                    {event.type === 'substitution' && player2Name && (
                      <span className="text-[10px] text-slate-500 mt-0.5">↑ {player2Name}</span>
                    )}
                    {event.type === 'goal' && player2Name && (
                      <span className="text-[9px] text-slate-600 italic mt-0.5">Pass: {player2Name}</span>
                    )}
                  </div>
                )}
                {isSystem && isHome && (
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{EVENT_LABELS[event.type]}</span>
                )}
              </div>

              {/* Icône Centrale */}
              <div className="z-10 w-8 h-8 rounded-full bg-[#1a1f2e] border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden ring-4 ring-[#0f1420]">
                {event.type === 'goal' ? (
                  <span className="text-xs">⚽</span>
                ) : event.type === 'yellow_card' ? (
                  <div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                ) : event.type === 'red_card' ? (
                  <div className="w-2.5 h-3.5 bg-red-500 rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                ) : event.type === 'substitution' ? (
                  <span className="text-green-400 text-xs font-black">⇄</span>
                ) : event.type === 'halftime' ? (
                   <span className="text-[10px]">⏸</span>
                ) : event.type === 'fulltime' ? (
                   <span className="text-[10px]">🏆</span>
                ) : (
                  <span className="text-[10px]">🏁</span>
                )}
              </div>

              {/* Côté Droit (Away) */}
              <div className="flex-1 flex justify-start pl-8">
                {!isHome && !isSystem && (
                  <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-500">{event.minute}'</span>
                      <span className="text-xs font-black text-white uppercase tracking-tight">{playerName}</span>
                      {(event.type === 'goal' || event.type === 'own_goal') && (
                         <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-black text-white shadow-lg">
                           {event.currentScore}
                         </span>
                      )}
                    </div>
                    {event.type === 'substitution' && player2Name && (
                      <span className="text-[10px] text-slate-500 mt-0.5">↑ {player2Name}</span>
                    )}
                    {event.type === 'goal' && player2Name && (
                      <span className="text-[9px] text-slate-600 italic mt-0.5">Pass: {player2Name}</span>
                    )}
                  </div>
                )}
                {isSystem && !isHome && (
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{EVENT_LABELS[event.type]}</span>
                )}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
