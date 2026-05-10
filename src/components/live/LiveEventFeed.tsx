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
  // Afficher les événements du plus récent au plus ancien (sauf kickoff en premier)
  const sorted = [...events].reverse()

  if (events.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-8 gap-2', className)}>
        <span className="text-2xl">⏳</span>
        <p className="text-slate-500 text-sm">En attente d'événements…</p>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-0', className)}>
      {sorted.map((event, idx) => {
        const isHome = event.team_id === homeTeamId
        const color = event.team_id
          ? (isHome ? homeColor : awayColor)
          : '#64748b'

        const isSystemEvent = ['kickoff', 'halftime', 'fulltime'].includes(event.type)
        const playerName = event.player
          ? `${event.player.first_name} ${event.player.last_name}`
          : null
        const player2Name = event.player2
          ? `${event.player2.first_name} ${event.player2.last_name}`
          : null

        if (isSystemEvent) {
          return (
            <div
              key={event.id}
              className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0"
            >
              <div className="flex-1 h-px bg-white/[0.06]" />
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-base">{EVENT_ICONS[event.type]}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {EVENT_LABELS[event.type]}
                </span>
                {event.minute !== null && (
                  <span className="text-[10px] text-slate-700 font-mono">{event.minute}'</span>
                )}
              </div>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          )
        }

        return (
          <div
            key={event.id}
            className={clsx(
              'flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0',
              'animate-fade-in-up',
              idx === 0 && 'bg-white/[0.02] rounded-lg px-2',
            )}
          >
            {/* Minute */}
            <div className="shrink-0 w-8 text-right">
              {event.minute !== null && (
                <span className="text-xs font-black tabular-nums" style={{ color }}>
                  {event.minute}'
                </span>
              )}
            </div>

            {/* Icône */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
              style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}
            >
              {EVENT_ICONS[event.type]}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                  {event.team?.name ?? EVENT_LABELS[event.type]}
                </span>
                {event.type === 'own_goal' && (
                  <span className="text-[9px] text-slate-600 bg-slate-700/30 px-1.5 py-0.5 rounded">CSC</span>
                )}
              </div>

              {playerName && (
                <p className="text-sm font-semibold text-white mt-0.5">{playerName}</p>
              )}

              {event.type === 'substitution' && player2Name && (
                <p className="text-xs text-slate-500 mt-0.5">
                  ↑ {player2Name}
                </p>
              )}

              {event.type === 'goal' && player2Name && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Passe déc. {player2Name}
                </p>
              )}

              {event.description && (
                <p className="text-xs text-slate-400 mt-1 italic">{event.description}</p>
              )}
            </div>

            {/* Indicateur côté */}
            {event.team_id && (
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: color + '60' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
