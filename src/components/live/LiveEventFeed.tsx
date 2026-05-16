/**
 * LiveEventFeed — Fil d'événements live en temps réel
 * Buts, cartons, remplacements, commentaires
 */
import { clsx } from 'clsx'
import type { MatchEvent } from '@/types/database'

const EVENT_ICONS: Record<string, string> = {
  goal: '⚽',
  own_goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
  kickoff: '🏁',
  halftime: '⏸️',
  fulltime: '🏆',
  comment: '💬',
  pause: '⏸️',
  resume: '▶️',
}

const EVENT_LABELS: Record<string, string> = {
  goal: 'But',
  own_goal: 'But contre son camp',
  yellow_card: 'Carton jaune',
  red_card: 'Carton rouge',
  substitution: 'Remplacement',
  kickoff: 'Coup d\'envoi',
  halftime: 'Mi-temps',
  fulltime: 'Fin du match',
  comment: '',
  pause: 'Match suspendu',
  resume: 'Reprise du jeu',
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
  // 1. Séparer les événements par période
  const period1 = events.filter(e => e.period === 1 || !e.period).sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
  const period2 = events.filter(e => e.period === 2).sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

  // Événements système spéciaux
  const halftimeEvent = events.find(e => e.type === 'halftime')
  const fulltimeEvent = events.find(e => e.type === 'fulltime')

  // Helper pour calculer le score à un instant T (cumulatif)
  const getScoreAt = (allEvents: MatchEvent[], currentEvent: MatchEvent) => {
    let h = 0, a = 0
    const sortedAll = [...allEvents].sort((x, y) => {
      if ((x.minute ?? 0) !== (y.minute ?? 0)) return (x.minute ?? 0) - (y.minute ?? 0)
      return new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
    })

    for (const e of sortedAll) {
      if (e.type === 'goal' || e.type === 'own_goal') {
        const isHome = e.type === 'own_goal' ? e.team_id !== homeTeamId : e.team_id === homeTeamId
        if (isHome) h++
        else a++
      }
      if (e.id === currentEvent.id) break
    }
    return `${h}-${a}`
  }

  const renderEvent = (event: MatchEvent) => {
    if (['halftime', 'fulltime', 'kickoff'].includes(event.type)) return null

    const isHome = event.team_id === homeTeamId
    const playerName = event.player ? `${event.player.first_name} ${event.player.last_name}` : null
    const player2Name = event.player2 ? `${event.player2.first_name} ${event.player2.last_name}` : null
    const scoreAt = getScoreAt(events, event)

    // Ajustement de la minute pour l'affichage en 2ème MT si elle est enregistrée en relatif (0-20)
    let displayMinute = event.minute ?? 0
    if (event.period === 2 && displayMinute < 20) {
      displayMinute += 20
    }

    // Cas spécial : Commentaire — affiché centré en pleine largeur
    if (event.type === 'comment') {
      return (
        <div key={event.id} className="relative flex items-center justify-center py-4 animate-in fade-in duration-700">
          <div className="max-w-xs px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl text-center">
            <p className="text-xs font-semibold text-slate-300 italic leading-relaxed">
              💬 {event.description}
            </p>
            <span className="mt-1.5 block text-[10px] font-bold text-slate-600 tabular-nums">{displayMinute}'</span>
          </div>
        </div>
      )
    }

    // Cas spécial : Événements système (Pause / Reprise)
    if (event.type === 'pause' || event.type === 'resume') {
      const isPause = event.type === 'pause'
      return (
        <div key={event.id} className="relative flex items-center justify-center py-6 animate-in zoom-in-95 fade-in duration-700">
           <div className={clsx(
             "px-6 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl backdrop-blur-xl transition-all",
             isPause 
               ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-amber-500/10" 
               : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/10"
           )}>
             <span className="mr-2">{EVENT_ICONS[event.type]}</span>
             {event.description || EVENT_LABELS[event.type]}
             <span className="ml-3 opacity-50 tabular-nums">{displayMinute}'</span>
           </div>
        </div>
      )
    }

    return (
      <div key={event.id} className="relative flex items-center justify-center min-h-[64px] group animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex-1 flex justify-end pr-8">
          {isHome && (
            <div className="flex flex-col items-end text-right transition-transform group-hover:-translate-x-1 duration-300">
              <div className="flex items-center gap-3">
                {(event.type === 'goal' || event.type === 'own_goal') && (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-[11px] font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30">
                    {scoreAt}
                  </span>
                )}
                <span className="text-sm font-black text-white uppercase tracking-tight leading-none">{playerName}</span>
                <span className="text-[11px] font-bold text-slate-500 tabular-nums">{displayMinute}'</span>
              </div>
              {event.type === 'substitution' && player2Name && (
                <div className="flex items-center gap-2 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-300 font-medium">
                    <span className="text-emerald-400 mr-1">↑</span> {player2Name}
                  </span>
                </div>
              )}
              {event.type === 'goal' && player2Name && (
                <span className="text-[10px] text-slate-500 italic mt-1 font-medium bg-white/5 px-2 py-0.5 rounded">
                  Passe: {player2Name}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={clsx(
          "z-10 w-10 h-10 rounded-2xl border flex items-center justify-center shadow-2xl overflow-hidden ring-8 ring-[#0f1420] transition-all duration-500 group-hover:scale-110",
          event.type === 'goal' ? "bg-blue-600 border-blue-400/50 rotate-12" : "bg-[#1a1f2e] border-white/10"
        )}>
          {event.type === 'goal' ? (
            <span className="text-lg drop-shadow-md">⚽</span>
          ) : event.type === 'yellow_card' ? (
            <div className="w-3 h-4.5 bg-yellow-400 rounded-sm shadow-[0_0_15px_rgba(250,204,21,0.6)] rotate-12" />
          ) : event.type === 'red_card' ? (
            <div className="w-3 h-4.5 bg-red-500 rounded-sm shadow-[0_0_15px_rgba(239,68,68,0.6)] rotate-12" />
          ) : event.type === 'substitution' ? (
            <span className="text-emerald-400 text-sm font-black">⇄</span>
          ) : (
            <span className="text-xs">💬</span>
          )}
        </div>

        <div className="flex-1 flex justify-start pl-8">
          {!isHome && (
            <div className="flex flex-col items-start text-left transition-transform group-hover:translate-x-1 duration-300">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500 tabular-nums">{displayMinute}'</span>
                <span className="text-sm font-black text-white uppercase tracking-tight leading-none">{playerName}</span>
                {(event.type === 'goal' || event.type === 'own_goal') && (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-[11px] font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30">
                    {scoreAt}
                  </span>
                )}
              </div>
              {event.type === 'substitution' && player2Name && (
                <div className="flex items-center gap-2 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-300 font-medium">
                    <span className="text-emerald-400 mr-1">↑</span> {player2Name}
                  </span>
                </div>
              )}
              {event.type === 'goal' && player2Name && (
                <span className="text-[10px] text-slate-500 italic mt-1 font-medium bg-white/5 px-2 py-0.5 rounded">
                  Passe: {player2Name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-12 gap-3 opacity-50', className)}>
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
          <span className="animate-pulse text-lg">⏳</span>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">En attente d'actions...</p>
      </div>
    )
  }

  return (
    <div className={clsx('relative py-4 max-w-2xl mx-auto', className)}>
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 transform -translate-x-1/2" />

      <div className="space-y-8 relative">
        {/* 2ÈME MI-TEMPS */}
        {period2.length > 0 && (
          <div className="space-y-6">
            {[...period2].reverse().map(renderEvent)}
          </div>
        )}

        {/* SÉPARATEUR MI-TEMPS — visible dès qu'il y a un event halftime OU des events de 2ème MT */}
        {(halftimeEvent || period2.length > 0) && (
          <div className="relative py-8 flex flex-col items-center justify-center gap-3">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
            <div className="relative px-4 bg-[#0f1420] flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Mi-temps</span>
              <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md shadow-xl">
                <span className="text-sm font-black text-blue-300 tracking-widest tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  HT {halftimeEvent ? getScoreAt(events, halftimeEvent) : '0-0'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1ÈRE MI-TEMPS */}
        <div className="space-y-6">
          {[...period1].reverse().map(renderEvent)}
        </div>

        {/* DÉBUT DU MATCH */}
        <div className="relative pt-4 flex flex-col items-center justify-center">
          <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">COUP D'ENVOI</span>
          </div>
        </div>
      </div>
    </div>
  )
}
