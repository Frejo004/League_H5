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
  // Trier par minute croissante, puis par date de création pour l'ordre exact
  const chronological = [...events].sort((a, b) => {
    const minA = a.minute ?? 0
    const minB = b.minute ?? 0
    if (minA !== minB) return minA - minB
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
  
  // Filtrer les doublons de systèmes (on ne garde que le premier kickoff et les derniers halftime/fulltime)
  const uniqueEvents: MatchEvent[] = []
  const systemsFound = new Set<string>()
  
  // On parcourt dans l'ordre chronologique pour identifier les systèmes
  chronological.forEach(e => {
    if (['halftime', 'fulltime', 'kickoff'].includes(e.type)) {
      // Pour le kickoff on garde le premier
      if (e.type === 'kickoff' && !systemsFound.has('kickoff')) {
        uniqueEvents.push(e)
        systemsFound.add('kickoff')
      } 
      // Pour les autres on remplace l'existant pour ne garder que le plus récent
      else if (e.type !== 'kickoff') {
        const idx = uniqueEvents.findIndex(ue => ue.type === e.type)
        if (idx !== -1) uniqueEvents[idx] = e
        else uniqueEvents.push(e)
      }
    } else {
      uniqueEvents.push(e)
    }
  })

  // Recalculer le score sur la liste nettoyée
  let homeScore = 0
  let awayScore = 0
  const eventsWithScore = uniqueEvents.map(event => {
    if (event.type === 'goal' || event.type === 'own_goal') {
      const isHomeGoal = event.type === 'own_goal' 
        ? event.team_id !== homeTeamId 
        : event.team_id === homeTeamId
      if (isHomeGoal) homeScore++
      else awayScore++
    }
    return { ...event, currentScore: `${homeScore}-${awayScore}` }
  })

  // Inverser pour l'affichage (plus récent en haut)
  const sorted = [...eventsWithScore].reverse()

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
          
          // Séparateurs spéciaux pour Mi-Temps et Fin du Match
          if (event.type === 'halftime' || event.type === 'fulltime') {
            const label = event.type === 'halftime' ? 'MI-TEMPS' : 'FIN DU MATCH'
            const scoreLabel = event.type === 'halftime' ? `HT ${event.currentScore}` : `FT ${event.currentScore}`
            
            return (
              <div key={event.id} className="relative py-8 flex flex-col items-center justify-center gap-3">
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                <div className="relative px-4 bg-[#0f1420] flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{label}</span>
                  <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                    <span className="text-sm font-black text-white tracking-widest tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {scoreLabel}
                    </span>
                  </div>
                </div>
              </div>
            )
          }

          const isSystem = ['kickoff'].includes(event.type)
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
