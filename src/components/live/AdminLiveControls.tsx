/**
 * AdminLiveControls — Panneau de contrôle admin pour piloter un match live
 * Démarrer, mi-temps, terminer, ajouter buts/cartons/commentaires
 */
import { useState } from 'react'
import { Play, Pause, Square, Plus, Trash2, MessageSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { useAdminMatchLive, useLiveClock } from '@/hooks/useMatchLive'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { MatchEvent } from '@/types/database'
import type { TeamRef } from '@/types/database'

interface AdminLiveControlsProps {
  matchId: string
  status: string
  liveStartedAt: string | null
  livePeriod: 1 | 2 | null
  homeTeam: TeamRef
  awayTeam: TeamRef
  homeScore: number
  awayScore: number
  events: MatchEvent[]
  homePlayers: Array<{ id: string; first_name: string; last_name: string }>
  awayPlayers: Array<{ id: string; first_name: string; last_name: string }>
}

export function AdminLiveControls({
  matchId, status, liveStartedAt, livePeriod,
  homeTeam, awayTeam, homeScore, awayScore,
  events, homePlayers, awayPlayers,
}: AdminLiveControlsProps) {
  const { user } = useAuth()
  const { startLive, startSecondHalf, endMatch, addEvent, deleteEvent } = useAdminMatchLive(matchId)
  const clock = useLiveClock(liveStartedAt, livePeriod, status)

  const [showEventForm, setShowEventForm] = useState(false)
  const [eventType, setEventType] = useState<string>('goal')
  const [eventTeam, setEventTeam] = useState<string>(homeTeam.id)
  const [eventPlayer, setEventPlayer] = useState<string>('')
  const [eventPlayer2, setEventPlayer2] = useState<string>('')
  const [eventMinute, setEventMinute] = useState<string>(String(clock.minute))
  const [eventComment, setEventComment] = useState<string>('')
  const [confirmEnd, setConfirmEnd] = useState(false)

  const isLive = status === 'live'
  const isScheduled = status === 'scheduled'
  const isCompleted = status === 'completed'

  const currentPlayers = eventTeam === homeTeam.id ? homePlayers : awayPlayers
  const otherPlayers = eventTeam === homeTeam.id ? awayPlayers : homePlayers

  const handleAddEvent = async () => {
    if (!user) return
    await addEvent.mutateAsync({
      type: eventType,
      minute: eventMinute ? parseInt(eventMinute) : null,
      period: livePeriod ?? 1,
      team_id: ['kickoff', 'halftime', 'fulltime', 'comment'].includes(eventType) ? null : eventTeam,
      player_id: eventPlayer || null,
      player2_id: eventPlayer2 || null,
      description: eventComment || null,
      created_by: user.id,
    })
    setShowEventForm(false)
    setEventPlayer('')
    setEventPlayer2('')
    setEventComment('')
  }

  return (
    <div className="card space-y-4 border-red-500/20 bg-red-500/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-white">Contrôles Live</span>
          {isLive && (
            <span className="text-xs text-slate-500">
              {livePeriod === 1 ? '1ère mi-temps' : '2ème mi-temps'} · {clock.label}
            </span>
          )}
        </div>
        {isLive && (
          <div className="flex items-center gap-2 text-sm font-black text-white tabular-nums">
            <span style={{ color: homeTeam.color }}>{homeScore}</span>
            <span className="text-slate-600">–</span>
            <span style={{ color: awayTeam.color }}>{awayScore}</span>
          </div>
        )}
      </div>

      {/* Boutons principaux */}
      <div className="flex flex-wrap gap-2">
        {isScheduled && (
          <button
            onClick={() => startLive.mutate()}
            disabled={startLive.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {startLive.isPending ? <LoadingSpinner size="sm" /> : <Play size={14} />}
            Démarrer le live
          </button>
        )}

        {isLive && livePeriod === 1 && (
          <button
            onClick={() => startSecondHalf.mutate()}
            disabled={startSecondHalf.isPending}
            className="btn-secondary flex items-center gap-2"
          >
            {startSecondHalf.isPending ? <LoadingSpinner size="sm" /> : <Pause size={14} />}
            Mi-temps → 2ème MT
          </button>
        )}

        {isLive && (
          <>
            <button
              onClick={() => setShowEventForm(v => !v)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus size={14} />
              Événement
            </button>

            {!confirmEnd ? (
              <button
                onClick={() => setConfirmEnd(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-colors"
              >
                <Square size={14} />
                Terminer
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Score final :</span>
                <button
                  onClick={() => { endMatch.mutate({ homeScore, awayScore }); setConfirmEnd(false) }}
                  disabled={endMatch.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  {endMatch.isPending ? <LoadingSpinner size="sm" /> : <Square size={12} />}
                  Confirmer {homeScore}–{awayScore}
                </button>
                <button onClick={() => setConfirmEnd(false)} className="text-slate-500 hover:text-slate-300 text-xs">
                  Annuler
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Formulaire d'événement */}
      {showEventForm && isLive && (
        <div className="border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nouvel événement</p>

          <div className="grid grid-cols-2 gap-2">
            {/* Type */}
            <div>
              <label className="label">Type</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="input text-sm py-1.5"
              >
                <option value="goal">⚽ But</option>
                <option value="own_goal">⚽ But CSC</option>
                <option value="yellow_card">🟨 Carton jaune</option>
                <option value="red_card">🟥 Carton rouge</option>
                <option value="substitution">🔄 Remplacement</option>
                <option value="comment">💬 Commentaire</option>
              </select>
            </div>

            {/* Minute */}
            <div>
              <label className="label">Minute</label>
              <input
                type="number"
                value={eventMinute}
                onChange={e => setEventMinute(e.target.value)}
                min={0} max={20}
                className="input text-sm py-1.5"
                placeholder={String(clock.minute)}
              />
            </div>
          </div>

          {/* Équipe */}
          {!['comment'].includes(eventType) && (
            <div>
              <label className="label">Équipe</label>
              <div className="flex gap-2">
                {[homeTeam, awayTeam].map(team => (
                  <button
                    key={team.id}
                    onClick={() => { setEventTeam(team.id); setEventPlayer(''); setEventPlayer2('') }}
                    className={clsx(
                      'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-all',
                      eventTeam === team.id
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 text-slate-400 hover:border-white/20',
                    )}
                  >
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Joueur principal */}
          {!['kickoff', 'halftime', 'fulltime', 'comment'].includes(eventType) && (
            <div>
              <label className="label">
                {eventType === 'substitution' ? 'Joueur sortant' : 'Joueur'}
              </label>
              <select
                value={eventPlayer}
                onChange={e => setEventPlayer(e.target.value)}
                className="input text-sm py-1.5"
              >
                <option value="">— Sélectionner —</option>
                {(eventType === 'own_goal' ? otherPlayers : currentPlayers).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Joueur secondaire (passeur ou remplaçant) */}
          {(eventType === 'goal' || eventType === 'substitution') && (
            <div>
              <label className="label">
                {eventType === 'substitution' ? 'Joueur entrant' : 'Passeur décisif (optionnel)'}
              </label>
              <select
                value={eventPlayer2}
                onChange={e => setEventPlayer2(e.target.value)}
                className="input text-sm py-1.5"
              >
                <option value="">— Aucun —</option>
                {currentPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Commentaire */}
          {eventType === 'comment' && (
            <div>
              <label className="label">Commentaire</label>
              <input
                type="text"
                value={eventComment}
                onChange={e => setEventComment(e.target.value)}
                className="input text-sm py-1.5"
                placeholder="Ex: Beau jeu collectif..."
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddEvent}
              disabled={addEvent.isPending}
              className="btn-primary text-sm py-1.5 flex items-center gap-1.5"
            >
              {addEvent.isPending ? <LoadingSpinner size="sm" /> : <Plus size={13} />}
              Ajouter
            </button>
            <button onClick={() => setShowEventForm(false)} className="btn-secondary text-sm py-1.5">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des événements récents avec suppression */}
      {events.length > 0 && isLive && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Événements récents</p>
          {[...events].reverse().slice(0, 5).map(ev => (
            <div key={ev.id} className="flex items-center gap-2 text-xs text-slate-400 group">
              <span className="font-mono text-slate-600 w-6 shrink-0">
                {ev.minute !== null ? `${ev.minute}'` : '—'}
              </span>
              <span className="flex-1 truncate">
                {ev.type === 'goal' && `⚽ But — ${ev.player?.first_name ?? ''} ${ev.player?.last_name ?? ''}`}
                {ev.type === 'own_goal' && `⚽ CSC — ${ev.player?.first_name ?? ''} ${ev.player?.last_name ?? ''}`}
                {ev.type === 'yellow_card' && `🟨 ${ev.player?.first_name ?? ''} ${ev.player?.last_name ?? ''}`}
                {ev.type === 'red_card' && `🟥 ${ev.player?.first_name ?? ''} ${ev.player?.last_name ?? ''}`}
                {ev.type === 'substitution' && `🔄 ${ev.player?.first_name ?? ''} → ${ev.player2?.first_name ?? ''}`}
                {ev.type === 'comment' && `💬 ${ev.description ?? ''}`}
                {ev.type === 'kickoff' && '🏁 Coup d\'envoi'}
                {ev.type === 'halftime' && '⏸️ Mi-temps'}
                {ev.type === 'fulltime' && '🏆 Fin du match'}
              </span>
              <button
                onClick={() => deleteEvent.mutate(ev.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all p-0.5"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
