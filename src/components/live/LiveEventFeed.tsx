/**
 * LiveEventFeed — Fil d'événements live en temps réel (buts, cartons, remplacements, actions)
 * Supporte le mode clair/sombre via CSS variables et propose des filtres intelligents.
 */
import { useState, useMemo } from 'react'
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
  shot: '🎯',
  shot_on_target: '🥅',
  foul: '⚠️',
  corner: '🚩',
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
  shot: 'Tir',
  shot_on_target: 'Tir cadré',
  foul: 'Faute',
  corner: 'Corner',
}

interface LiveEventFeedProps {
  events: MatchEvent[]
  homeTeamId: string
  homeColor: string
  awayColor: string
  className?: string
}

export function LiveEventFeed({
  events, homeTeamId, className,
}: LiveEventFeedProps) {
  // Déterminer si le match est terminé pour adapter le filtre par défaut
  const isFinished = useMemo(() => events.some(e => e.type === 'fulltime'), [events])

  // Filtre actif : 'essential' (par défaut si fini), 'all' (par défaut si live) ou 'actions'
  const [activeFilter, setActiveFilter] = useState<'essential' | 'actions' | 'all'>(() => {
    return isFinished ? 'essential' : 'all'
  })

  // Helper pour calculer le score à un instant T (cumulatif)
  const getScoreAt = (allEvents: MatchEvent[], currentEvent: MatchEvent) => {
    const getAbsoluteMinute = (ev: MatchEvent) => {
      let m = ev.minute ?? 0
      if (ev.period === 2 && m < 20) {
        m += 20
      }
      if (ev.type === 'fulltime') {
        return 1000 // Toujours à la toute fin du match !
      }
      return m
    }

    let h = 0, a = 0
    const sortedAll = [...allEvents].sort((x, y) => {
      const mX = getAbsoluteMinute(x)
      const mY = getAbsoluteMinute(y)
      if (mX !== mY) return mX - mY
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

  // Filtrer les événements
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events
    if (activeFilter === 'essential') {
      return events.filter(e =>
        ['goal', 'own_goal', 'yellow_card', 'red_card', 'substitution', 'pause', 'resume', 'fulltime', 'halftime', 'kickoff', 'comment'].includes(e.type)
      )
    }
    if (activeFilter === 'actions') {
      return events.filter(e =>
        ['shot', 'shot_on_target', 'foul', 'corner'].includes(e.type)
      )
    }
    return events
  }, [events, activeFilter])

  // Séparer les événements par période
  const period1 = useMemo(() => {
    return filteredEvents
      .filter(e => e.period === 1 || !e.period)
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
  }, [filteredEvents])

  const period2 = useMemo(() => {
    return filteredEvents
      .filter(e => e.period === 2)
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
  }, [filteredEvents])

  // Événements système spéciaux
  const halftimeEvent = useMemo(() => events.find(e => e.type === 'halftime'), [events])
  const fulltimeEvent = useMemo(() => events.find(e => e.type === 'fulltime'), [events])

  const renderEvent = (event: MatchEvent) => {
    if (['halftime', 'fulltime', 'kickoff'].includes(event.type)) return null

    const isHome = event.team_id === homeTeamId
    const playerName = event.player ? `${event.player.first_name} ${event.player.last_name}` : null
    const player2Name = event.player2 ? `${event.player2.first_name} ${event.player2.last_name}` : null
    const scoreAt = getScoreAt(events, event)

    // Ajustement de la minute pour l'affichage en 2ème MT
    let displayMinute = event.minute ?? 0
    if (event.period === 2 && displayMinute < 20) {
      displayMinute += 20
    }

    // Commentaire
    if (event.type === 'comment') {
      return (
        <div key={event.id} className="relative flex items-center justify-center py-4 animate-in fade-in duration-700 delay-200">
          <div className="max-w-xs px-5 py-3 rounded-2xl bg-surface-raised border border-surface-border shadow-xl text-center">
            <p className="text-xs font-semibold text-text-secondary italic leading-relaxed">
              💬 {event.description}
            </p>
            <span className="mt-1.5 block text-[10px] font-bold text-text-muted tabular-nums">{displayMinute}'</span>
          </div>
        </div>
      )
    }

    // Événements système (Pause / Reprise)
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
      <div key={event.id} className="relative flex items-center justify-center min-h-16 group animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        {/* Home Event Description */}
        <div className="flex-1 flex justify-end pr-8">
          {isHome && (
            <div className="flex flex-col items-end text-right transition-transform group-hover:-translate-x-1 duration-300">
              <div className="flex items-center gap-3">
                {(event.type === 'goal' || event.type === 'own_goal') && (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-[11px] font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30">
                    {scoreAt}
                  </span>
                )}
                <span className="text-sm font-black text-(--t1) uppercase tracking-tight leading-none">
                  {event.type === 'own_goal' && playerName ? `${playerName} (CSC)` : (playerName || EVENT_LABELS[event.type])}
                </span>
                <span className="text-[11px] font-bold text-(--tm) tabular-nums">{displayMinute}'</span>
              </div>
              {event.type === 'substitution' && player2Name && (
                <div className="flex items-center gap-2 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-(--t2) font-medium">
                    <span className="text-emerald-500 mr-1">↑</span> {player2Name}
                  </span>
                </div>
              )}
              {event.type === 'goal' && player2Name && (
                <span className="text-[10px] text-(--tm) italic mt-1 font-medium bg-(--bg-pill) px-2 py-0.5 rounded">
                  Passe: <span className="text-(--t2) font-semibold">{player2Name}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Central Icon */}
        <div className={clsx(
          "z-10 w-10 h-10 rounded-2xl border flex items-center justify-center shadow-2xl overflow-hidden ring-8 ring-offset-2 ring-offset-surface transition-all duration-500 group-hover:scale-110",
          "ring-surface", // Dynamic background ring
          (event.type === 'goal' || event.type === 'own_goal') ? "bg-blue-600 border-blue-400/50 rotate-12 text-white" : "bg-surface-raised border-surface-border text-text-primary"
        )}>
          {(event.type === 'goal' || event.type === 'own_goal') ? (
            <span className="text-lg drop-shadow-md">⚽</span>
          ) : event.type === 'yellow_card' ? (
            <div className="w-3 h-4.5 bg-yellow-400 rounded-sm shadow-[0_0_15px_rgba(250,204,21,0.6)] rotate-12" />
          ) : event.type === 'red_card' ? (
            <div className="w-3 h-4.5 bg-red-500 rounded-sm shadow-[0_0_15px_rgba(239,68,68,0.6)] rotate-12" />
          ) : event.type === 'substitution' ? (
            <span className="text-emerald-500 text-sm font-black">⇄</span>
          ) : ['shot', 'shot_on_target', 'foul', 'corner'].includes(event.type) ? (
            <span className="text-base">{EVENT_ICONS[event.type]}</span>
          ) : (
            <span className="text-xs">💬</span>
          )}
        </div>

        {/* Away Event Description */}
        <div className="flex-1 flex justify-start pl-8">
          {!isHome && (
            <div className="flex flex-col items-start text-left transition-transform group-hover:translate-x-1 duration-300">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-text-muted tabular-nums">{displayMinute}'</span>
                <span className="text-sm font-black text-text-primary uppercase tracking-tight leading-none">
                  {event.type === 'own_goal' && playerName ? `${playerName} (CSC)` : (playerName || EVENT_LABELS[event.type])}
                </span>
                {(event.type === 'goal' || event.type === 'own_goal') && (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-[11px] font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30">
                    {scoreAt}
                  </span>
                )}
              </div>
              {event.type === 'substitution' && player2Name && (
                <div className="flex items-center gap-2 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-text-secondary font-medium">
                    <span className="text-emerald-500 mr-1">↑</span> {player2Name}
                  </span>
                </div>
              )}
              {event.type === 'goal' && player2Name && (
                <span className="text-[10px] text-text-muted italic mt-1 font-medium bg-surface-raised px-2 py-0.5 rounded">
                  Passe: <span className="text-text-secondary font-semibold">{player2Name}</span>
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
    <div className={clsx('relative py-2 max-w-2xl mx-auto', className)}>
      {/* Filters Bar */}
      <div className="flex justify-center gap-2 mb-6 border-b border-(--bd)/20 pb-4">
        {[
          { id: 'essential', label: 'Essentiels', desc: 'Buts, Cartons, Remplacements' },
          { id: 'actions', label: 'Actions', desc: 'Tirs, Fautes, Corners' },
          { id: 'all', label: 'Tout', desc: 'Tous les événements' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setActiveFilter(opt.id as 'essential' | 'actions' | 'all')}
            className={clsx("active:scale-95",
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border",
              activeFilter === opt.id
                ? "bg-primary-500 text-white border-primary-500 shadow-sm font-black"
                : "bg-surface-raised text-text-secondary border-transparent hover:bg-surface-card hover:text-text-primary"
            )}
            title={opt.desc}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Central Timeline Vertical Line */}
      <div className="absolute left-1/2 top-16 bottom-0 w-px bg-surface-border transform -translate-x-1/2" />

      {/* Empty State for Filter */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <p className="text-xs font-bold uppercase tracking-widest">Aucun événement dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-8 relative">
          {/* FIN DU MATCH */}
          {fulltimeEvent && activeFilter !== 'actions' && (
            <div className="relative py-8 flex flex-col items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="absolute inset-x-0 top-1/2 h-px bg-surface-border" />
              <div className="relative px-4 bg-surface flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Fin du match</span>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md shadow-xl">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-300 tracking-widest tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    FT {getScoreAt(events, fulltimeEvent)}
                  </span>
                </div>
              </div> 
            </div>
          )}

          {/* 2ÈME MI-TEMPS */}
          {period2.length > 0 && (
            <div className="space-y-6">
              {[...period2].reverse().map(renderEvent)}
            </div>
          )}

          {/* SÉPARATEUR MI-TEMPS */}
          {(halftimeEvent || period2.length > 0) && activeFilter !== 'actions' && (
            <div className="relative py-8 flex flex-col items-center justify-center gap-3">
              <div className="absolute inset-x-0 top-1/2 h-px bg-surface-border" />
              <div className="relative px-4 bg-surface flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Mi-temps</span>
                <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md shadow-xl">
                  <span className="text-sm font-black text-blue-600 dark:text-blue-300 tracking-widest tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    HT {halftimeEvent ? getScoreAt(events, halftimeEvent) : '0-0'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 1ÈRE MI-TEMPS */}
          {period1.length > 0 && (
            <div className="space-y-6">
              {[...period1].reverse().map(renderEvent)}
            </div>
          )}

          {/* DÉBUT DU MATCH */}
          {activeFilter !== 'actions' && (
            <div className="relative pt-4 flex flex-col items-center justify-center">
              <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 z-10">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">COUP D'ENVOI</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
