/**
 * AdminLiveControls — Panneau de contrôle admin pour piloter un match live
 * Démarrer, mi-temps, terminer, ajouter buts/cartons/commentaires
 */
import { useState, useMemo } from 'react'
import * as FramerMotion from 'framer-motion'
const { motion, AnimatePresence } = FramerMotion
import { Play, Pause, Square, Plus, Trash2, AlertTriangle, Camera, Mic, TrendingUp, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAdminMatchLive, useLiveClock } from '@/hooks/useMatchLive'
import { useAuth } from '@/hooks/useAuth'
import { useDisciplinaryStats } from '@/hooks/useDisciplinaryStats'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useMatchLineups } from '@/hooks/useLineups'
import { useWebRTCBroadcaster } from '@/hooks/useWebRTCStream'
import { useAppToast } from '@/hooks/useAppToast'
import { AppToastContainer } from '@/components/ui/AppToastContainer'
import { useCameraDevices } from '@/hooks/useCameraDevices'
import { BroadcastOverlay } from '@/components/live/BroadcastOverlay'
import type { MatchEvent, TeamRef, MatchEventType } from '@/types/database'

// ── Modal de confirmation suppression ────────────────────────────────────────
function DeleteConfirmModal({
  event,
  onConfirm,
  onCancel,
  isPending,
}: {
  event: MatchEvent
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const typeLabel: Record<string, string> = {
    goal: '⚽ But', own_goal: '⚽ CSC', yellow_card: '🟨 Carton Jaune',
    red_card: '🟥 Carton Rouge', substitution: '🔄 Remplacement',
    shot: '🎯 Tir', shot_on_target: '🎯 Tir Cadré',
    foul: '⚠️ Faute', corner: '🚩 Corner', comment: '💬 Commentaire',
    kickoff: '🏁 Coup d\'envoi', halftime: '⏸️ Mi-temps', fulltime: '🏆 Fin',
    pause: '⏸️ Pause', resume: '▶️ Reprise',
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--color-surface-card)] border border-red-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 space-y-5 animate-in zoom-in-95 fade-in duration-200">
        {/* Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-wider">Supprimer l'action ?</p>
            <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-0.5">Cette action est irréversible</p>
          </div>
        </div>

        {/* Event preview */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)]">
          <span className="text-xs font-black text-[var(--color-text-muted)] tabular-nums w-8 shrink-0">
            {event.minute !== null ? `${event.minute}'` : '—'}
          </span>
          <span className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-wide flex-1">
            {typeLabel[event.type] ?? event.type}
          </span>
          {event.player && (
            <span className="text-[10px] text-[var(--color-text-muted)] font-bold truncate max-w-[100px]">
              {event.player.first_name} {event.player.last_name}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[var(--color-surface-border)] text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-widest hover:bg-[var(--color-surface-raised)] transition-all"
          > 
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-500 border border-red-400/30 text-[11px] font-black text-white uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
          >
            {isPending ? <LoadingSpinner size="sm" /> : <Trash2 size={13} />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

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
  seasonId: string
}

export function AdminLiveControls({
  matchId, status, liveStartedAt, halftimeAt, livePeriod,
  isPaused, pausedAt, totalPausedSeconds,
  homeTeam, awayTeam, homeScore, awayScore,
  events, homePlayers, awayPlayers, seasonId
}: AdminLiveControlsProps) {
  const { user } = useAuth()
  const { startLive, signalHalftime, startSecondHalf, togglePause, endMatch, addEvent, deleteEvent } = useAdminMatchLive(matchId)
  const clock = useLiveClock(liveStartedAt, livePeriod, status, halftimeAt, isPaused, pausedAt, totalPausedSeconds)
  const { toast, toasts, dismiss } = useAppToast()

  const [showEventForm, setShowEventForm] = useState(false)
  const [eventType, setEventType] = useState<MatchEventType>('goal')
  const [eventTeam, setEventTeam] = useState<string>(homeTeam.id)
  const [eventPlayer, setEventPlayer] = useState<string>('')
  const [eventPlayer2, setEventPlayer2] = useState<string>('')
  const [eventMinute, setEventMinute] = useState<string>('')
  const [eventComment, setEventComment] = useState<string>('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MatchEvent | null>(null)

  // ── Sélection caméra / micro ──────────────────────────────────────────────
  const [showDevicePanel, setShowDevicePanel] = useState(false)
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | undefined>()
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | undefined>()
  const { videoDevices, audioDevices, refresh: refreshDevices } = useCameraDevices()

  const { data: stats } = useDisciplinaryStats(seasonId)

  const isLive = status === 'live'
  const isScheduled = status === 'scheduled'
  const currentPeriod: 1 | 2 = livePeriod ?? 1

  const currentPlayers = eventTeam === homeTeam.id ? homePlayers : awayPlayers
  const otherPlayers = eventTeam === homeTeam.id ? awayPlayers : homePlayers

  // Récupérer les compositions de match saisies par le capitaine
  const { data: lineups = [] } = useMatchLineups(matchId)

  const { stream, isBroadcasting, startBroadcast, stopBroadcast, viewerCount, networkQuality, switchCamera, facingMode } = useWebRTCBroadcaster(matchId, {
    onError: (msg, detail) => toast.error(msg, detail),
    videoDeviceId: selectedVideoDeviceId,
    audioDeviceId: selectedAudioDeviceId,
  })

  // ── Référence vidéo pour la prévisualisation caméra de l'admin ─────────────────────
  // Note : la preview est maintenant gérée par BroadcastOverlay (plein écran / PiP)

  // Calculer le score en direct basé uniquement sur les événements reçus (events) pour éviter tout décalage
  const computedScore = useMemo(() => {
    return events.reduce((acc, event) => {
      if (event.type === 'goal' || event.type === 'own_goal') {
        const isHomeGoal = event.type === 'own_goal'
          ? event.team_id !== homeTeam.id
          : event.team_id === homeTeam.id
        if (isHomeGoal) acc.home++
        else acc.away++
      }
      return acc
    }, { home: 0, away: 0 })
  }, [events, homeTeam.id])

  const homeScoreVal = isLive ? computedScore.home : homeScore
  const awayScoreVal = isLive ? computedScore.away : awayScore

  // Filtrer les compositions pour l'équipe en cours et l'équipe adverse
  const teamLineup = useMemo(() => lineups.filter(l => l.team_id === eventTeam), [lineups, eventTeam])
  const otherTeamLineup = useMemo(() => lineups.filter(l => l.team_id !== eventTeam), [lineups, eventTeam])

  // Liste des joueurs retenus dans la compo par le capitaine (titulaires + remplaçants)
  // S'il n'y a pas de compo, on utilise la liste de tous les joueurs de l'équipe
  const teamLineupPlayers = useMemo(() => {
    if (teamLineup.length === 0) return currentPlayers
    return teamLineup.map(l => ({
      id: l.player_id,
      first_name: l.player?.first_name || '',
      last_name: l.player?.last_name || '',
    }))
  }, [teamLineup, currentPlayers])

  const otherTeamLineupPlayers = useMemo(() => {
    if (otherTeamLineup.length === 0) return otherPlayers
    return otherTeamLineup.map(l => ({
      id: l.player_id,
      first_name: l.player?.first_name || '',
      last_name: l.player?.last_name || '',
    }))
  }, [otherTeamLineup, otherPlayers])

  // Calcul dynamique des joueurs actuellement sur le terrain (starters) et sur le banc (subs)
  const substitutionPlayers = useMemo(() => {
    if (teamLineup.length === 0) {
      return {
        starters: currentPlayers,
        subs: currentPlayers
      }
    }

    const startersIds = teamLineup.filter(l => l.is_starter).map(l => l.player_id)

    const pitchSet = new Set<string>(startersIds)

    // Parcourir chronologiquement les événements de remplacement pour cette équipe
    const subEvents = [...events]
      .filter(e => e.type === 'substitution' && e.team_id === eventTeam)
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

    subEvents.forEach(ev => {
      const outId = ev.player_id
      const inId = ev.player2_id

      if (outId) {
        pitchSet.delete(outId)
      }
      if (inId) {
        pitchSet.add(inId)
      }
    })

    const allLineupPlayers = teamLineup.map(l => ({
      id: l.player_id,
      first_name: l.player?.first_name || '',
      last_name: l.player?.last_name || '',
    }))

    // Les joueurs sortants possibles sont les joueurs de la compo actuellement sur le terrain
    const starters = allLineupPlayers.filter(p => pitchSet.has(p.id))

    // Les joueurs entrants possibles sont tous les joueurs de l'effectif qui ne sont pas actuellement sur le terrain
    const subs = currentPlayers.filter(p => !pitchSet.has(p.id))

    return { starters, subs }
  }, [teamLineup, currentPlayers, events, eventTeam])

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
    <div className="space-y-4 sm:space-y-6">
      {/* ── STICKY HEADER CONTROLS ── */}
      <div className="sticky top-0 z-[50] -mx-4 px-4 py-3 bg-[var(--color-surface-card)]/95 backdrop-blur-md border-b border-[var(--color-surface-border)] shadow-xl transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className={clsx(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isScheduled ? "bg-slate-400" : isPaused ? "bg-amber-400" : "bg-red-400"
              )} />
              <span className={clsx(
                "relative inline-flex rounded-full h-2 w-2",
                isScheduled ? "bg-slate-500" : isPaused ? "bg-amber-500" : "bg-red-500"
              )} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] leading-none mb-1">
                {isScheduled 
                  ? 'Avant-match' 
                  : status === 'finished' 
                    ? 'Terminé' 
                    : livePeriod === 1 
                      ? '1ère MT' 
                      : clock.phase === 2 
                        ? 'Mi-temps' 
                        : '2ème MT'
                }
              </span>
              <span className="text-sm font-black text-[var(--color-text-primary)] tabular-nums leading-none">
                {clock.label}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center min-w-[120px]">
            <div className="flex items-center gap-2 text-2xl font-black text-[var(--color-text-primary)] tabular-nums drop-shadow-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              <div className="w-8 flex justify-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span 
                    key={`home-${homeScoreVal}`}
                    initial={{ y: 20, opacity: 0, scale: 0.5 }}
                    animate={{ y: 0, opacity: 1, scale: 1, color: homeTeam.color }}
                    exit={{ y: -20, opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {homeScoreVal}
                  </motion.span>
                </AnimatePresence>
              </div>
              
              <span className="text-[var(--color-text-muted)] text-xl opacity-40">-</span>
              
              <div className="w-8 flex justify-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span 
                    key={`away-${awayScoreVal}`}
                    initial={{ y: 20, opacity: 0, scale: 0.5 }}
                    animate={{ y: 0, opacity: 1, scale: 1, color: awayTeam.color }}
                    exit={{ y: -20, opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {awayScoreVal}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLive && clock.phase !== 2 && (
              <button
                onClick={() => togglePause.mutate(pauseReason)}
                className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── QUICK GOAL BUTTONS (ONLY ON MOBILE) ── */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <button
          onClick={() => { setEventType('goal'); setEventTeam(homeTeam.id); setShowEventForm(true); }}
          className="flex flex-col items-center justify-center py-4 rounded-2xl bg-blue-600 text-white shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={20} className="mb-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">But {homeTeam.name.split(' ')[0]}</span>
        </button>
        <button
          onClick={() => { setEventType('goal'); setEventTeam(awayTeam.id); setShowEventForm(true); }}
          className="flex flex-col items-center justify-center py-4 rounded-2xl bg-red-600 text-white shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={20} className="mb-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">But {awayTeam.name.split(' ')[0]}</span>
        </button>
      </div>

      {/* ── QUICK ACTIONS (STATS) ── */}
      <div className="card p-5 sm:p-6 space-y-5 sm:space-y-6 relative overflow-hidden bg-[var(--card-bg)] border-[var(--color-surface-border)] transition-colors">
        <div className="absolute top-0 right-0 p-8 bg-white/2 rounded-full -mr-4 -mt-4 blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10 border-b border-[var(--color-surface-border)] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp size={16} />
            </div>
            <h2 className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Actions Rapides (Stats)</h2>
          </div>
          
          {isLive && (
            <button 
              onClick={() => setConfirmEnd(true)}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Terminer
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 relative z-10">
          {/* Home Stats Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: homeTeam.color, color: homeTeam.color }} />
              <span className="text-[11px] font-black text-[var(--color-text-primary)] uppercase tracking-wider truncate">{homeTeam.name}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(['shot', 'shot_on_target', 'foul', 'corner'] as const).map(type => (
                <button
                  key={type}
                  disabled={isPaused || addEvent.isPending}
                  onClick={() => addEvent.mutate({ type, team_id: homeTeam.id, minute: clock.minute, period: livePeriod as 1|2 })}
                  className="group relative flex items-center justify-between px-4 py-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-surface-border)] hover:bg-[var(--color-surface-raised)] active:scale-95 disabled:opacity-30 transition-all shadow-lg"
                >
                  <span className="text-[12px] font-black text-[var(--color-text-primary)] uppercase tracking-widest">
                    {type === 'shot' ? 'Tir' : type === 'shot_on_target' ? 'Cadré' : type === 'foul' ? 'Faute' : 'Corner'}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-[var(--color-surface-raised)] flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
                    <Plus size={14} className="text-[var(--color-text-muted)]" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Away Stats Column */}
          <div className="space-y-4 text-right">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <span className="text-[11px] font-black text-[var(--color-text-primary)] uppercase tracking-wider truncate">{awayTeam.name}</span>
              <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: awayTeam.color, color: awayTeam.color }} />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(['shot', 'shot_on_target', 'foul', 'corner'] as const).map(type => (
                <button
                  key={type}
                  disabled={isPaused || addEvent.isPending}
                  onClick={() => addEvent.mutate({ type, team_id: awayTeam.id, minute: clock.minute, period: livePeriod as 1|2 })}
                  className="group relative flex items-center justify-between px-4 py-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-surface-border)] hover:bg-[var(--color-surface-raised)] active:scale-95 disabled:opacity-30 transition-all shadow-lg"
                >
                  <div className="w-6 h-6 rounded-lg bg-[var(--color-surface-raised)] flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
                    <Plus size={14} className="text-[var(--color-text-muted)]" />
                  </div>
                  <span className="text-[12px] font-black text-[var(--color-text-primary)] uppercase tracking-widest">
                    {type === 'shot' ? 'Tir' : type === 'shot_on_target' ? 'Cadré' : type === 'foul' ? 'Faute' : 'Corner'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contrôles Principaux */}
        <div className={clsx(
          "card p-5 sm:p-6 space-y-5 sm:space-y-6 relative overflow-hidden transition-all duration-500",
          isPaused ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--color-surface-border)] bg-[var(--color-surface-card)]/50"
        )}>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "p-2.5 rounded-xl border transition-colors",
                isPaused ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-surface-border)]"
              )}>
                {isPaused ? <Pause size={16} /> : <Play size={16} />}
              </div>
              <h2 className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Flux & Match</h2>
            </div>
          </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
          {isScheduled && (
            <button
              onClick={() => startLive.mutate()}
              disabled={startLive.isPending}
              className="btn-primary flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest py-3 px-5 shadow-xl col-span-full"
            >
              {startLive.isPending ? <LoadingSpinner size="sm" /> : <Play size={18} />}
              Démarrer le live
            </button>
          )}

          {/* Bouton Pause/Reprendre */}
          {isLive && clock.phase !== 2 && (
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-amber-500/5 border border-amber-500/20 p-2 rounded-2xl col-span-full">
              {!isPaused && (
                <input
                  type="text"
                  placeholder="Motif (ex: Blessure...)"
                  value={pauseReason}
                  onChange={e => setPauseReason(e.target.value)}
                  className="bg-[var(--color-surface-card)] border-none text-[10px] py-2.5 px-4 rounded-xl flex-1 focus:ring-1 focus:ring-amber-500/50 text-amber-600 placeholder:text-amber-500/30 font-black uppercase tracking-wider"
                />
              )}
              <button
                onClick={() => { togglePause.mutate(pauseReason); setPauseReason('') }}
                disabled={togglePause.isPending}
                className={clsx(
                  "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all shadow-sm",
                  isPaused
                    ? "bg-green-500/20 border-green-500/40 text-green-600 hover:bg-green-500/30 flex-1"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-600 hover:bg-amber-500/30 min-w-[120px]"
                )}
              >
                {togglePause.isPending ? <LoadingSpinner size="sm" /> : isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? 'Reprendre le jeu' : 'Pause'}
              </button>
            </div>
          )}

          {/* Bouton Mi-temps */}
          {isLive && livePeriod === 1 && !halftimeAt && (
            <button
              onClick={() => signalHalftime.mutate()}
              disabled={signalHalftime.isPending}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-600 hover:bg-blue-500/30 text-[11px] font-black uppercase tracking-widest transition-colors"
            >
              {signalHalftime.isPending ? <LoadingSpinner size="sm" /> : <Pause size={16} />}
              Siffler la Mi-temps
            </button>
          )}

          {/* Décompte mi-temps + bouton lancer 2ème MT */}
          {isLive && livePeriod === 1 && halftimeAt && (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/30 col-span-full">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-600 text-xs font-black uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Pause {clock.breakSecondsLeft !== null
                    ? `${Math.floor(clock.breakSecondsLeft / 60)}:${String(clock.breakSecondsLeft % 60).padStart(2, '0')}`
                    : '5:00'
                  }
                </span>
              </div>
              <button
                onClick={() => startSecondHalf.mutate()}
                disabled={startSecondHalf.isPending}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                {startSecondHalf.isPending ? <LoadingSpinner size="sm" /> : <Play size={14} />}
                Lancer 2ème MT
              </button>
            </div>
          )}

          {isLive && (
            <>
              <button
                onClick={() => setShowEventForm(v => !v)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-surface-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] text-[11px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
              >
                <Plus size={16} />
                + Événement
              </button>

              <div className="flex gap-2">
                <button
                  onClick={isBroadcasting ? stopBroadcast : startBroadcast}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95",
                    isBroadcasting
                      ? (stream
                          ? "bg-red-500 text-white border-red-500/50 shadow-[0_10px_20px_rgba(239,68,68,0.3)]"
                          : "bg-amber-500 text-white border-amber-500/50 animate-pulse")
                      : "bg-[#C8F135]/10 border-[#C8F135]/30 text-[#C8F135] hover:bg-[#C8F135]/20"
                  )}
                >
                  {isBroadcasting ? (stream ? <Square size={14} /> : <LoadingSpinner size="sm" />) : <Play size={16} />}
                  {isBroadcasting ? (stream ? 'Arrêter' : 'Démarrage...') : 'Filmer Match'}
                </button>

                {!isBroadcasting && (
                  <button
                    onClick={() => { refreshDevices(); setShowDevicePanel(v => !v) }} 
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-all shadow-sm active:scale-95"
                    title="Choisir caméra / micro"
                  >
                    <Camera size={18} />
                  </button>
                )}
              </div>

              {/* Panneau sélection caméra / micro */}
              {showDevicePanel && !isBroadcasting && (
                <div className="w-full rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-card)] p-5 space-y-4 animate-in slide-in-from-top-2 duration-200 col-span-full shadow-inner">
                  <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <Camera size={12} /> Configuration média
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                        <Camera size={10} /> Caméra
                      </label>
                      <select 
                        value={selectedVideoDeviceId ?? ''}
                        onChange={e => setSelectedVideoDeviceId(e.target.value || undefined)}
                        className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl px-4 py-2.5 text-[11px] font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-[#C8F135]/20 focus:outline-none"
                      >
                        <option value="">Caméra arrière (défaut)</option>
                        {videoDevices.map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                        <Mic size={10} /> Micro
                      </label>
                      <select 
                        value={selectedAudioDeviceId ?? ''}
                        onChange={e => setSelectedAudioDeviceId(e.target.value || undefined)}
                        className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl px-4 py-2.5 text-[11px] font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-[#C8F135]/20 focus:outline-none"
                      >
                        <option value="">Micro par défaut</option>
                        {audioDevices.map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Terminer Match */}
              <div className="col-span-full pt-2">
                {!confirmEnd ? (
                  <button
                    onClick={() => setConfirmEnd(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-500/70 hover:bg-red-500/10 hover:text-red-500 text-[11px] font-black uppercase tracking-[0.2em] transition-all"
                  >
                    <Square size={14} />
                    Terminer le match
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Alerte Cartons Jaunes */}
                    {(() => {
                      const suspendedPlayers = [...homePlayers, ...awayPlayers].filter(p => {
                        const pStats = stats?.players.find(s => s.player_id === p.id)
                        const matchYellows = events?.filter(e => e.player_id === p.id && e.type === 'yellow_card').length || 0
                        const totalYellows = (pStats?.yellow_cards || 0) + matchYellows
                        return totalYellows >= 3
                      })

                      if (suspendedPlayers.length > 0) {
                        return (
                          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                            <p className="text-[10px] font-black text-amber-500 uppercase leading-tight flex items-center gap-2">
                              <AlertTriangle size={12} />
                              Attention : {suspendedPlayers.length} joueur{suspendedPlayers.length > 1 ? 's' : ''} suspendu{suspendedPlayers.length > 1 ? 's' : ''} (3 jaunes).
                            </p>
                          </div>
                        )
                      }
                      return null
                    })()}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-red-500/10 p-2 rounded-2xl border border-red-500/20 animate-in fade-in zoom-in-95 duration-200">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-500/80 px-3 py-1">Confirmer score : {homeScoreVal}-{awayScoreVal} ?</span>
                      <div className="flex gap-2 flex-1">
                        <button
                          onClick={() => {
                            stopBroadcast()
                            endMatch.mutate({ homeScore: homeScoreVal, awayScore: awayScoreVal })
                            setConfirmEnd(false)
                          }}
                          disabled={endMatch.isPending}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                        >
                          {endMatch.isPending ? <LoadingSpinner size="sm" /> : <CheckCircle2 size={14} />}
                          OUI, TERMINER
                        </button>
                        <button 
                          onClick={() => setConfirmEnd(false)} 
                          className="px-6 py-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        >
                          NON
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Suggestions de commentaires auto */}
        {isLive && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pt-2 relative z-10">
            {(() => {
              const homeShots = events?.filter(e => e.team_id === homeTeam.id && (e.type === 'shot' || e.type === 'shot_on_target')).length || 0
              const awayShots = events?.filter(e => e.team_id === awayTeam.id && (e.type === 'shot' || e.type === 'shot_on_target')).length || 0
              const fouls = events?.filter(e => e.type === 'foul').length || 0

              const suggestions = []
              if (homeShots > 5 && homeShots > awayShots + 3) suggestions.push(`Domination totale de ${homeTeam.name} (${homeShots} tirs) !`)
              if (awayShots > 5 && awayShots > homeShots + 3) suggestions.push(`Le siège continue devant le but de ${homeTeam.name} !`)
              if (fouls > 6) suggestions.push(`Match très engagé physiquement (${fouls} fautes) !`)
              if (homeScoreVal > 3 || awayScoreVal > 3) suggestions.push(`Quel festival offensif aujourd'hui !`)

              return suggestions.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setEventType('comment')
                    setEventComment(text)
                    setShowEventForm(true)
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-[9px] font-bold text-primary-400 uppercase tracking-wider hover:bg-primary-500/20 transition-all"
                >
                  💡 {text}
                </button>
              ))
            })()}
          </div>
        )}

        {/* Modal Formulaire d'événement */}
        {showEventForm && isLive && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setShowEventForm(false)}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-lg rounded-[2rem] p-6 space-y-6 bg-[var(--color-surface-card)] border border-[var(--color-surface-border)] shadow-2xl animate-in zoom-in-95 fade-in duration-300 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] pb-4">
                <p className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  <span className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_currentColor]"></span>
                  Nouvel événement
                </p>
                <button 
                  onClick={() => setShowEventForm(false)}
                  className="p-2 rounded-full hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] transition-colors"
                >
                  <Square size={16} className="rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block ml-1">Type d'action</label>
                  <select
                    value={eventType} 
                    onChange={e => setEventType(e.target.value as MatchEventType)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-2xl px-4 py-3 text-sm font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500/20 focus:outline-none appearance-none"
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block ml-1">Minute</label>
                  <input
                    type="number" 
                    value={eventMinute}
                    onChange={e => setEventMinute(e.target.value)}
                    min={0} max={120}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-2xl px-4 py-3 text-lg font-black tabular-nums text-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    placeholder={String(clock.minute)}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  />
                </div>
              </div>

              {/* Équipe */}
              {!['comment'].includes(eventType) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block ml-1">Équipe concernée</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[homeTeam, awayTeam].map(team => ( 
                      <button
                        key={team.id}
                        onClick={() => { setEventTeam(team.id); setEventPlayer(''); setEventPlayer2('') }}
                        className={clsx(
                          'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300',
                          eventTeam === team.id
                            ? 'border-primary-500/50 bg-primary-500/10 shadow-[0_0_15px_rgba(200,241,53,0.1)]'
                            : 'border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] grayscale opacity-60 hover:grayscale-0 hover:opacity-100',
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" style={{ backgroundColor: team.color }}>
                          {team.logo_url ? <img src={team.logo_url} className="w-5 h-5 object-contain" /> : <span className="text-white font-black text-xs">{team.name[0]}</span>}
                        </div>
                        <span className={clsx("text-[10px] font-black uppercase tracking-wider truncate w-full text-center", eventTeam === team.id ? 'text-primary-500' : 'text-[var(--color-text-muted)]')}>
                          {team.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Joueurs */}
              <div className="space-y-4">
                {!['kickoff', 'halftime', 'fulltime', 'comment'].includes(eventType) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block ml-1">
                      {eventType === 'substitution' ? 'Joueur sortant' : 'Joueur principal'}
                    </label> 
                    <select
                      value={eventPlayer}
                      onChange={e => setEventPlayer(e.target.value)}
                      className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-2xl px-4 py-3 text-sm font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    >
                      <option value="">— Sélectionner le joueur —</option>
                      {(eventType === 'substitution'
                      ? substitutionPlayers.starters
                      : teamLineupPlayers)
                      .filter(p => p.id !== eventPlayer2)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(eventType === 'goal' || eventType === 'substitution') && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block ml-1">
                      {eventType === 'substitution' ? 'Joueur entrant' : 'Passeur décisif (optionnel)'}
                    </label> 
                    <select
                      value={eventPlayer2}
                      onChange={e => setEventPlayer2(e.target.value)}
                      className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-2xl px-4 py-3 text-sm font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    >
                      <option value="">— {eventType === 'substitution' ? 'Sélectionner le joueur' : 'Aucun passeur'} —</option>
                      {(eventType === 'substitution' ? substitutionPlayers.subs : teamLineupPlayers)
                        .filter(p => p.id !== eventPlayer)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {eventType === 'comment' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] block ml-1">Commentaire en direct</label>
                    <textarea
                      value={eventComment} 
                      onChange={e => setEventComment(e.target.value)}
                      rows={3}
                      className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-2xl px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
                      placeholder="Décrivez l'action en quelques mots..."
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-surface-border)]">
                <button
                  onClick={handleAddEvent}
                  disabled={addEvent.isPending}
                  className="flex-1 btn-primary text-xs font-black uppercase tracking-[0.15em] py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary-500/20 active:scale-[0.98] transition-all"
                >
                  {addEvent.isPending ? <LoadingSpinner size="sm" /> : <Plus size={16} />}
                  Enregistrer l'action
                </button>
                <button 
                  onClick={() => setShowEventForm(false)} 
                  className="px-6 py-4 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] text-[var(--color-text-muted)] text-xs font-black uppercase tracking-widest hover:text-[var(--color-text-primary)] transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gestion des derniers événements (Correction) */}
        {isLive && events && events.length > 0 && (
          <div className="pt-6 border-t border-[var(--color-surface-border)] space-y-4">
            <div className="flex items-center justify-between px-1"> 
              <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Dernières Actions (Correction)</p>
              <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase">Supprimer pour annuler</span>
            </div>

            <div className="space-y-2">
              {[...events].reverse().slice(0, 5).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between bg-[var(--color-surface-card)] p-3 rounded-xl border border-[var(--color-surface-border)] group hover:border-red-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[var(--color-text-muted)] tabular-nums w-6 shrink-0">{ev.minute !== null ? `${ev.minute}'` : '—'}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[var(--color-text-primary)] uppercase tracking-wider">
                          {ev.type === 'goal' ? '⚽ But' :
                            ev.type === 'own_goal' ? '⚽ CSC (Contre son camp)' :
                              ev.type === 'yellow_card' ? '🟨 Carton Jaune' :
                                ev.type === 'red_card' ? '🟥 Carton Rouge' :
                                  ev.type === 'substitution' ? '🔄 Remplacement' :
                                    ev.type === 'shot' ? '🎯 Tir' :
                                      ev.type === 'shot_on_target' ? '🎯 Tir Cadré' :
                                        ev.type === 'foul' ? '⚠️ Faute' :
                                          ev.type === 'corner' ? '🚩 Corner' :
                                            ev.type === 'kickoff' ? '🏁 Début du match' :
                                              ev.type === 'halftime' ? '⏸️ Mi-temps' :
                                                ev.type === 'fulltime' ? '🏆 Fin du match' :
                                                  ev.type === 'pause' ? '⏸️ Pause' :
                                                    ev.type === 'resume' ? '▶️ Reprise' :
                                                      ev.type === 'comment' ? `💬 Commentaire` : ev.type}
                        </span> 
                        {ev.team && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.team.color }} />
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase truncate max-w-[200px]">
                        {ev.type === 'substitution'
                          ? `${ev.player?.first_name} → ${ev.player2?.first_name}`
                          : ev.type === 'comment' 
                            ? ev.description
                            : ev.player
                              ? `${ev.player.first_name} ${ev.player.last_name}`
                              : ev.team?.name || 'Match'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteTarget(ev)}
                    disabled={deleteEvent.isPending}
                    className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Modal de confirmation suppression */}
    {deleteTarget && (
      <DeleteConfirmModal
        event={deleteTarget}
        isPending={deleteEvent.isPending}
        onConfirm={() => {
          deleteEvent.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
          })
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    )}

    {/* Notifications système (erreurs caméra, etc.) */}
    <AppToastContainer toasts={toasts} onDismiss={dismiss} />

    {/* Overlay broadcast — plein écran au démarrage, PiP si réduit */}
    <BroadcastOverlay
      stream={stream}
      isBroadcasting={isBroadcasting}
      viewerCount={viewerCount}
      networkQuality={networkQuality}
      facingMode={facingMode}
      clockLabel={clock.label}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      homeScore={homeScoreVal}
      awayScore={awayScoreVal}
      isPaused={isPaused}
      onSwitchCamera={switchCamera}
      onStopBroadcast={stopBroadcast}
      actionsSlot={isLive ? (
        <div className="space-y-3">
          {/* Stats rapides — accessible depuis la vue fullscreen */}
          <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Domicile */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: homeTeam.color }} />
                <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{homeTeam.name}</span>
              </div>
              {(['shot', 'shot_on_target', 'foul', 'corner'] as const).map(type => ( 
                <button
                  key={type}
                  disabled={isPaused || addEvent.isPending}
                  onClick={() => addEvent.mutate({ type, team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[9px] font-black text-slate-300 uppercase hover:bg-white/20 disabled:opacity-40 transition-all"
                >
                  {type === 'shot' ? 'Tir' : type === 'shot_on_target' ? 'Cadré' : type === 'foul' ? 'Faute' : 'Corner'}
                </button>
              ))}
            </div>
            {/* Extérieur */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1 justify-end">
                <span className="text-[9px] font-bold text-text-muted uppercase truncate">{awayTeam.name}</span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: awayTeam.color }} />
              </div>
              {(['shot', 'shot_on_target', 'foul', 'corner'] as const).map(type => (
                <button
                  key={type}
                  disabled={isPaused || addEvent.isPending}
                  onClick={() => addEvent.mutate({ type, team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[9px] font-black text-slate-300 uppercase hover:bg-white/20 disabled:opacity-40 transition-all"
                >
                  {type === 'shot' ? 'Tir' : type === 'shot_on_target' ? 'Cadré' : type === 'foul' ? 'Faute' : 'Corner'}
                </button>
              ))}
            </div>
          </div>
          {/* Bouton événement complet */}
          <button
            onClick={() => setShowEventForm(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#C8F135]/10 border border-[#C8F135]/30 text-[#C8F135] text-[10px] font-black uppercase tracking-widest hover:bg-[#C8F135]/20 transition-all"
          >
            <Plus size={12} />
            But / Carton / Remplacement
          </button>
        </div>
      ) : undefined}
    />
  </div>
  )
}
