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
import type { MatchEvent, TeamRef, MatchEventType } from '@/types/database'

interface AdminLiveControlsProps {
  matchId: string
  status: string
  liveStartedAt: string | null
  halftimeAt: string | null
  livePeriod: 1 | 2 | null
  isPaused: boolean
  pausedAt: string | null
  totalPausedSeconds: number
  homeTeam: TeamRef
  awayTeam: TeamRef
  homeScore: number
  awayScore: number
  events: MatchEvent[]
  homePlayers: Array<{ id: string; first_name: string; last_name: string }>
  awayPlayers: Array<{ id: string; first_name: string; last_name: string }>
}

export function AdminLiveControls({
  matchId, status, liveStartedAt, halftimeAt, livePeriod,
  isPaused, pausedAt, totalPausedSeconds,
  homeTeam, awayTeam, homeScore, awayScore,
  events, homePlayers, awayPlayers,
}: AdminLiveControlsProps) {
  const { user } = useAuth()
  const { startLive, signalHalftime, startSecondHalf, togglePause, endMatch, addEvent, deleteEvent } = useAdminMatchLive(matchId)
  const clock = useLiveClock(liveStartedAt, livePeriod, status, halftimeAt, isPaused, pausedAt, totalPausedSeconds)

  const [showEventForm, setShowEventForm] = useState(false)
  const [eventType, setEventType] = useState<MatchEventType>('goal')
  const [eventTeam, setEventTeam] = useState<string>(homeTeam.id)
  const [eventPlayer, setEventPlayer] = useState<string>('')
  const [eventPlayer2, setEventPlayer2] = useState<string>('')
  const [eventMinute, setEventMinute] = useState<string>('')
  const [eventComment, setEventComment] = useState<string>('')
  const [confirmEnd, setConfirmEnd] = useState(false)

  const isLive = status === 'live'
  const isScheduled = status === 'scheduled'

  const currentPlayers = eventTeam === homeTeam.id ? homePlayers : awayPlayers
  const otherPlayers = eventTeam === homeTeam.id ? awayPlayers : homePlayers

  const handleAddEvent = async () => {
    if (!user) return

    let finalMinute = clock.minute
    if (eventMinute) {
      finalMinute = parseInt(eventMinute)
    }

    await addEvent.mutateAsync({
      type: eventType,
      minute: finalMinute,
      period: livePeriod as 1 | 2 || 1,
      team_id: (['kickoff', 'halftime', 'fulltime', 'comment'] as MatchEventType[]).includes(eventType) ? null : eventTeam,
      player_id: eventPlayer || null,
      player2_id: eventPlayer2 || null,
      description: eventComment || null,
    })
    setShowEventForm(false)
    setEventPlayer('')
    setEventPlayer2('')
    setEventComment('')
  }

  return (
    <div className={clsx(
      "relative overflow-hidden p-5 rounded-2xl glass-morphism border transition-all duration-500 space-y-5 shadow-2xl",
      isPaused ? "border-amber-500/30 bg-amber-500/5 shadow-amber-500/10" : "border-red-500/30 bg-red-500/5 shadow-red-500/10"
    )}>
      <div className={clsx(
        "absolute inset-0 pointer-events-none transition-opacity duration-700",
        isPaused ? "bg-amber-500/5" : "bg-red-500/5"
      )} />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-500",
            isPaused ? "text-amber-500" : "text-red-500",
            !isPaused && "animate-pulse"
          )} style={{ backgroundColor: 'currentColor' }} />
          <span className="text-base font-black text-white uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {isPaused ? 'Match en Pause' : 'Contrôles Live'}
          </span>
          {isLive && (
            <span className={clsx(
              "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ml-2 transition-all",
              clock.phase === 2
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse"
                : isPaused 
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
            )}>
              {clock.phase === 2 ? `Pause MT • ${clock.shortLabel.replace('Pause ', '')}` : livePeriod === 1 ? `1ère MT • ${clock.shortLabel}` : `2ème MT • ${clock.shortLabel}`}
            </span>
          )}
        </div>
        {isLive && (
          <div className="flex items-center gap-2 text-xl font-black text-white tabular-nums drop-shadow-md" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            <span style={{ color: homeTeam.color }}>{homeScore}</span>
            <span className="text-white/20 text-sm">-</span>
            <span style={{ color: awayTeam.color }}>{awayScore}</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 relative z-10">
        {isScheduled && (
          <button
            onClick={() => startLive.mutate()}
            disabled={startLive.isPending}
            className="btn-primary flex items-center gap-2 text-sm font-bold uppercase tracking-wider py-2.5 px-5 shadow-[0_0_15px_rgba(200,241,53,0.3)] hover:shadow-[0_0_20px_rgba(200,241,53,0.5)]"
          >
            {startLive.isPending ? <LoadingSpinner size="sm" /> : <Play size={16} />}
            Démarrer le live
          </button>
        )}

        {/* Bouton Pause/Reprendre */}
        {isLive && clock.phase !== 2 && (
          <button
            onClick={() => togglePause.mutate()}
            disabled={togglePause.isPending}
            className={clsx(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all",
              isPaused 
                ? "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30" 
                : "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
            )}
          >
            {togglePause.isPending ? <LoadingSpinner size="sm" /> : isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? 'Reprendre' : 'Pause'}
          </button>
        )}

        {/* Bouton Mi-temps */}
        {isLive && livePeriod === 1 && !halftimeAt && (
          <button
            onClick={() => signalHalftime.mutate()}
            disabled={signalHalftime.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            {signalHalftime.isPending ? <LoadingSpinner size="sm" /> : <Pause size={14} />}
            Mi-temps
          </button>
        )}

        {/* Décompte mi-temps + bouton lancer 2ème MT */}
        {isLive && livePeriod === 1 && halftimeAt && (
          <div className="flex items-center gap-3 bg-blue-500/10 px-4 py-2.5 rounded-lg border border-blue-500/30">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-300 text-xs font-black uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Pause {clock.breakSecondsLeft !== null
                ? `${Math.floor(clock.breakSecondsLeft / 60)}:${String(clock.breakSecondsLeft % 60).padStart(2, '0')}`
                : '5:00'
              }
            </span>
            <button
              onClick={() => startSecondHalf.mutate()}
              disabled={startSecondHalf.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors"
            >
              {startSecondHalf.isPending ? <LoadingSpinner size="sm" /> : <Play size={12} />}
              Lancer 2ème MT
            </button>
          </div>
        )}

        {isLive && (
          <>
            <button
              onClick={() => setShowEventForm(v => !v)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <Plus size={14} />
              Événement
            </button>

            {!confirmEnd ? (
              <button
                onClick={() => setConfirmEnd(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase tracking-widest transition-colors ml-auto"
              >
                <Square size={14} />
                Terminer
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-red-500/10 p-1.5 rounded-xl border border-red-500/20 ml-auto">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 ml-2">Score final :</span>
                <button
                  onClick={() => { endMatch.mutate({ homeScore, awayScore }); setConfirmEnd(false) }}
                  disabled={endMatch.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                >
                  {endMatch.isPending ? <LoadingSpinner size="sm" /> : <Square size={12} />}
                  Confirmer {homeScore}-{awayScore}
                </button>
                <button onClick={() => setConfirmEnd(false)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white px-2">
                  Annuler
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Stats Rapides */}
      {isLive && (
        <div className="pt-2 border-t border-white/5 space-y-3 relative z-10">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Actions Rapides (Stats)</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Home Team Stats */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: homeTeam.color }} />
                <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{homeTeam.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addEvent.mutate({ type: 'shot', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Tir
                </button>
                <button
                  onClick={() => addEvent.mutate({ type: 'shot_on_target', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Cadré
                </button>
                <button
                  onClick={() => addEvent.mutate({ type: 'foul', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Faute
                </button>
                <button
                  onClick={() => addEvent.mutate({ type: 'corner', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Corner
                </button>
              </div>
            </div>

            {/* Away Team Stats */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1 justify-end text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{awayTeam.name}</span>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: awayTeam.color }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addEvent.mutate({ type: 'shot', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Tir
                </button>
                <button
                  onClick={() => addEvent.mutate({ type: 'shot_on_target', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Cadré
                </button>
                <button
                  onClick={() => addEvent.mutate({ type: 'foul', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Faute
                </button>
                <button
                  onClick={() => addEvent.mutate({ type: 'corner', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 transition-all"
                >
                  Corner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'événement */}
      {showEventForm && isLive && (
        <div className="rounded-xl p-5 space-y-4 bg-black/40 border border-white/10 shadow-inner relative z-10 animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_5px_currentColor]"></span>
            Nouvel événement
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Type</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value as MatchEventType)}
                className="input text-sm font-medium py-2 bg-black/40 border-white/10"
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Minute</label>
              <input
                type="number"
                value={eventMinute}
                onChange={e => setEventMinute(e.target.value)}
                min={0} max={120}
                className="input text-base font-black tabular-nums py-2 bg-black/40 border-white/10 text-primary-400"
                placeholder={String(clock.minute)}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              />
            </div>
          </div>

          {/* Équipe */}
          {!['comment'].includes(eventType) && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Équipe</label>
              <div className="flex gap-2">
                {[homeTeam, awayTeam].map(team => (
                  <button
                    key={team.id}
                    onClick={() => { setEventTeam(team.id); setEventPlayer(''); setEventPlayer2('') }}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all',
                      eventTeam === team.id
                        ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                        : 'border-white/5 bg-black/40 text-slate-400 hover:border-white/20 hover:text-white',
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Joueurs... (même logique qu'avant) */}
          <div className="space-y-4">
             {!['kickoff', 'halftime', 'fulltime', 'comment'].includes(eventType) && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
                  {eventType === 'substitution' ? 'Joueur sortant' : 'Joueur'}
                </label>
                <select
                  value={eventPlayer}
                  onChange={e => setEventPlayer(e.target.value)}
                  className="input text-sm font-medium py-2 bg-black/40 border-white/10"
                >
                  <option value="">— Sélectionner —</option>
                  {(eventType === 'own_goal' ? otherPlayers : currentPlayers)
                    .filter(p => p.id !== eventPlayer2)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                </select>
              </div>
            )}

            {(eventType === 'goal' || eventType === 'substitution') && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
                  {eventType === 'substitution' ? 'Joueur entrant' : 'Passeur (optionnel)'}
                </label>
                <select
                  value={eventPlayer2}
                  onChange={e => setEventPlayer2(e.target.value)}
                  className="input text-sm font-medium py-2 bg-black/40 border-white/10"
                >
                  <option value="">— Aucun —</option>
                  {currentPlayers
                    .filter(p => p.id !== eventPlayer)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                </select>
              </div>
            )}

            {eventType === 'comment' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Commentaire</label>
                <input
                  type="text"
                  value={eventComment}
                  onChange={e => setEventComment(e.target.value)}
                  className="input text-sm py-2 bg-black/40 border-white/10"
                  placeholder="Ex: Beau jeu collectif..."
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-white/5">
            <button
              onClick={handleAddEvent}
              disabled={addEvent.isPending}
              className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-6 flex items-center gap-1.5"
            >
              {addEvent.isPending ? <LoadingSpinner size="sm" /> : <Plus size={14} />}
              Ajouter l'événement
            </button>
            <button onClick={() => setShowEventForm(false)} className="btn-secondary text-xs font-bold uppercase tracking-wider py-2 px-4">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Événements récents */}
      {events.length > 0 && isLive && (
        <div className="space-y-2 pt-2 relative z-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Historique des actions</p>
          <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
            {[...events].reverse().slice(0, 5).map(ev => (
              <div key={ev.id} className="flex items-center gap-3 py-2 px-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors group">
                <span className="text-sm font-black tabular-nums text-slate-500 w-6 shrink-0 text-center" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {ev.minute !== null ? `${ev.minute}'` : '—'}
                </span>
                <span className="flex-1 truncate text-xs font-bold tracking-wide uppercase">
                  {ev.type === 'goal' && <span className="text-white"><span className="text-primary-400 mr-1">⚽ BUT</span> — {ev.player?.first_name} {ev.player?.last_name}</span>}
                  {ev.type === 'own_goal' && <span className="text-white"><span className="text-red-400 mr-1">⚽ CSC</span> — {ev.player?.first_name} {ev.player?.last_name}</span>}
                  {ev.type === 'yellow_card' && <span className="text-white"><span className="text-amber-400 mr-1">🟨 JAUNE</span> — {ev.player?.first_name} {ev.player?.last_name}</span>}
                  {ev.type === 'red_card' && <span className="text-white"><span className="text-red-500 mr-1">🟥 ROUGE</span> — {ev.player?.first_name} {ev.player?.last_name}</span>}
                  {ev.type === 'substitution' && <span className="text-slate-300"><span className="text-blue-400 mr-1">🔄</span> {ev.player?.first_name} → {ev.player2?.first_name}</span>}
                  {ev.type === 'comment' && <span className="text-slate-400 italic">💬 {ev.description}</span>}
                  {ev.type === 'kickoff' && <span className="text-green-400">🏁 DÉBUT</span>}
                  {ev.type === 'halftime' && <span className="text-blue-400">⏸️ MI-TEMPS</span>}
                  {ev.type === 'fulltime' && <span className="text-red-400">🏆 FIN</span>}
                </span>
                <button
                  onClick={() => deleteEvent.mutate(ev.id)}
                  title="Annuler cet événement"
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all p-1.5 rounded-lg"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

