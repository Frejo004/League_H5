/**
 * AdminLiveControls — Panneau de contrôle admin pour piloter un match live
 * Démarrer, mi-temps, terminer, ajouter buts/cartons/commentaires
 */
import { useState, useMemo } from 'react'
import { Play, Pause, Square, Plus, Trash2, AlertTriangle, Camera, Mic } from 'lucide-react'
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
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0f1420] border border-red-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 space-y-5 animate-in zoom-in-95 fade-in duration-200">
        {/* Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wider">Supprimer l'action ?</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Cette action est irréversible</p>
          </div>
        </div>

        {/* Event preview */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs font-black text-slate-400 tabular-nums w-8 shrink-0">
            {event.minute !== null ? `${event.minute}'` : '—'}
          </span>
          <span className="text-xs font-black text-white uppercase tracking-wide flex-1">
            {typeLabel[event.type] ?? event.type}
          </span>
          {event.player && (
            <span className="text-[10px] text-slate-400 font-bold truncate max-w-[100px]">
              {event.player.first_name} {event.player.last_name}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/5 transition-all"
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
  videoUrl?: string | null
}

export function AdminLiveControls({
  matchId, status, liveStartedAt, halftimeAt, livePeriod,
  isPaused, pausedAt, totalPausedSeconds,
  homeTeam, awayTeam, homeScore, awayScore,
  events, homePlayers, awayPlayers, seasonId, videoUrl
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

  const [editingVideoUrl, setEditingVideoUrl] = useState(false)
  const [videoUrlInput, setVideoUrlInput] = useState(videoUrl || '')

  // ── Sélection caméra / micro ──────────────────────────────────────────────
  const [showDevicePanel, setShowDevicePanel] = useState(false)
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | undefined>()
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | undefined>()
  const { videoDevices, audioDevices, refresh: refreshDevices } = useCameraDevices()

  const { data: stats } = useDisciplinaryStats(seasonId)

  const isLive = status === 'live'
  const isScheduled = status === 'scheduled'

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

  const updateVideoUrl = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from('matches').update({ video_url: url }).eq('id', matchId)
      if (error) throw error
    },
    onSuccess: () => {
      setEditingVideoUrl(false)
    }
  })

  return (
    <>
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
                {clock.phase === 2 ? `Pause MT • ${clock.shortLabel.replace('Pause ', '')}` : livePeriod === 1 ? `1ère MT • ${clock.label}` : `2ème MT • ${clock.label}`}
              </span>
            )}
          </div>
          {isLive && (
            <div className="flex items-center gap-2 text-xl font-black text-white tabular-nums drop-shadow-md" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              <span style={{ color: homeTeam.color }}>{homeScoreVal}</span>
              <span className="text-white/20 text-sm">-</span>
              <span style={{ color: awayTeam.color }}>{awayScoreVal}</span>
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
            <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 p-1.5 rounded-xl">
              {!isPaused && (
                <input
                  type="text"
                  placeholder="Motif (ex: Blessure...)"
                  value={pauseReason}
                  onChange={e => setPauseReason(e.target.value)}
                  className="bg-black/40 border-none text-[10px] py-1.5 px-3 rounded-lg w-32 focus:ring-1 focus:ring-amber-500/50 text-amber-200 placeholder:text-amber-500/30 font-bold uppercase"
                />
              )}
              <button
                onClick={() => { togglePause.mutate(pauseReason); setPauseReason('') }}
                disabled={togglePause.isPending}
                className={clsx(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                  isPaused
                    ? "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                )}
              >
                {togglePause.isPending ? <LoadingSpinner size="sm" /> : isPaused ? <Play size={12} /> : <Pause size={12} />}
                {isPaused ? 'Reprendre' : 'Pause'}
              </button>
            </div>
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

              <div className="flex items-center gap-2 ml-4 relative">
                {editingVideoUrl ? (
                  <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 p-1">
                    <input
                      type="text"
                      value={videoUrlInput}
                      onChange={e => setVideoUrlInput(e.target.value)}
                      placeholder="Lien YouTube ou Twitch..."
                      className="bg-transparent border-none text-[10px] py-1.5 px-3 w-48 focus:ring-0 text-white font-bold"
                    />
                    <button
                      onClick={() => updateVideoUrl.mutate(videoUrlInput)}
                      disabled={updateVideoUrl.isPending}
                      className="bg-primary-500 text-black px-3 py-1.5 rounded text-[10px] font-black uppercase"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => { setEditingVideoUrl(false); setVideoUrlInput(videoUrl || '') }}
                      className="text-white/40 hover:text-white px-2 text-[10px] font-black uppercase"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingVideoUrl(true)}
                      className={clsx(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border",
                        videoUrl
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <Play size={14} />
                      {videoUrl ? 'Changer Vidéo' : 'Lien Vidéo'}
                    </button>

                    {/* Broadcast from device */}
                    <button
                      onClick={isBroadcasting ? stopBroadcast : startBroadcast}
                      className={clsx(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border",
                        isBroadcasting
                          ? (stream
                              ? "bg-red-500 text-white border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                              : "bg-amber-500 text-white border-amber-500/50 animate-pulse")
                          : "bg-[#C8F135]/10 border-[#C8F135]/30 text-[#C8F135] hover:bg-[#C8F135]/20"
                      )}
                    >
                      {isBroadcasting ? (stream ? <Square size={14} /> : <LoadingSpinner size="sm" />) : <Play size={14} />}
                      {isBroadcasting ? (stream ? 'Arrêter Caméra' : 'Démarrage...') : 'Filmer Match'}
                    </button>

                    {/* Bouton sélection caméra/micro (avant démarrage uniquement) */}
                    {!isBroadcasting && (
                      <button
                        onClick={() => { refreshDevices(); setShowDevicePanel(v => !v) }}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Choisir caméra / micro"
                      >
                        <Camera size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Panneau sélection caméra / micro */}
              {showDevicePanel && !isBroadcasting && (
                <div className="w-full mt-3 rounded-xl border border-white/10 bg-black/40 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Camera size={11} /> Caméra &amp; Micro
                  </p>

                  {/* Sélecteur caméra */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1">
                      <Camera size={9} /> Caméra
                    </label>
                    <select
                      value={selectedVideoDeviceId ?? ''}
                      onChange={e => setSelectedVideoDeviceId(e.target.value || undefined)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold text-white focus:ring-1 focus:ring-[#C8F135]/50 focus:outline-none"
                    >
                      <option value="">Caméra arrière (défaut)</option>
                      {videoDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sélecteur micro */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1">
                      <Mic size={9} /> Micro
                    </label>
                    <select
                      value={selectedAudioDeviceId ?? ''}
                      onChange={e => setSelectedAudioDeviceId(e.target.value || undefined)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold text-white focus:ring-1 focus:ring-[#C8F135]/50 focus:outline-none"
                    >
                      <option value="">Micro par défaut</option>
                      {audioDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[9px] text-slate-600 leading-relaxed">
                    Sur iPhone, les labels apparaissent après avoir accordé la permission caméra.
                  </p>
                </div>
              )}

              {/* BroadcastOverlay — plein écran au démarrage, PiP si réduit */}
              {/* La preview inline est supprimée : l'overlay gère tout */}
              {isBroadcasting && !stream && (
                <div className="w-full mt-4 rounded-xl border border-white/10 bg-black/40 aspect-video flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#C8F135] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Accès caméra...</p>
                </div>
              )}

              {!confirmEnd ? (
                <button
                  onClick={() => setConfirmEnd(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase tracking-widest transition-colors ml-auto"
                >
                  <Square size={14} />
                  Terminer
                </button>
              ) : (
                <div className="flex flex-col gap-3 ml-auto items-end">
                  {/* Alerte Cartons Jaunes */}
                  {(() => {
                    const suspendedPlayers = [...homePlayers, ...awayPlayers].filter(p => {
                      const pStats = stats?.players.find(s => s.player_id === p.id)
                      // On vérifie s'il vient de prendre un jaune dans CE match et qu'il était déjà à 2
                      const matchYellows = events?.filter(e => e.player_id === p.id && e.type === 'yellow_card').length || 0
                      const totalYellows = (pStats?.yellow_cards || 0) + matchYellows
                      return totalYellows >= 3
                    })

                    if (suspendedPlayers.length > 0) {
                      return (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg max-w-[300px]">
                          <p className="text-[10px] font-black text-amber-400 uppercase leading-tight">
                            ⚠️ Attention : {suspendedPlayers.length} joueur{suspendedPlayers.length > 1 ? 's' : ''} {suspendedPlayers.length > 1 ? 'ont' : 'a'} atteint 3 jaunes et sera suspendu.
                          </p>
                        </div>
                      )
                    }
                    return null
                  })()}

                  <div className="flex items-center gap-3 bg-red-500/10 p-1.5 rounded-xl border border-red-500/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-2">Score final :</span>
                    <button
                      onClick={() => { endMatch.mutate({ homeScore: homeScoreVal, awayScore: awayScoreVal }); setConfirmEnd(false) }}
                      disabled={endMatch.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    >
                      {endMatch.isPending ? <LoadingSpinner size="sm" /> : <Square size={12} />}
                      Confirmer {homeScoreVal}-{awayScoreVal}
                    </button>
                    <button onClick={() => setConfirmEnd(false)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white px-2">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats Rapides */}
        {isLive && (
          <div className="pt-2 border-t border-white/5 space-y-3 relative z-10">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions Rapides (Stats)</p>
              {isPaused && (
                <span className="text-[9px] font-bold text-amber-500 uppercase animate-pulse">Jeu Suspendu</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Home Team Stats */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: homeTeam.color }} />
                  <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{homeTeam.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'shot', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer un tir"}
                  >
                    Tir
                  </button>
                  <button
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'shot_on_target', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer un tir cadré"}
                  >
                    Cadré
                  </button>
                  <button
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'foul', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer une faute"}
                  >
                    Faute
                  </button>
                  <button
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'corner', team_id: homeTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer un corner"}
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
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'shot', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer un tir"}
                  >
                    Tir
                  </button>
                  <button
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'shot_on_target', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer un tir cadré"}
                  >
                    Cadré
                  </button>
                  <button
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'foul', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer une faute"}
                  >
                    Faute
                  </button>
                  <button
                    disabled={isPaused || addEvent.isPending}
                    onClick={() => addEvent.mutate({ type: 'corner', team_id: awayTeam.id, minute: clock.minute, period: livePeriod as any })}
                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
                    title={isPaused ? "Impossible d'ajouter des stats pendant une pause" : "Enregistrer un corner"}
                  >
                    Corner
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    {(eventType === 'substitution'
                      ? substitutionPlayers.starters
                      : eventType === 'own_goal'
                        ? otherTeamLineupPlayers
                        : teamLineupPlayers)
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
                    <option value="">— {eventType === 'substitution' ? 'Sélectionner' : 'Aucun'} —</option>
                    {(eventType === 'substitution' ? substitutionPlayers.subs : teamLineupPlayers)
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

        {/* Gestion des derniers événements (Correction) */}
        {isLive && events && events.length > 0 && (
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Dernières Actions (Correction)</p>
              <span className="text-[9px] font-bold text-slate-600 uppercase">Supprimer pour annuler</span>
            </div>

            <div className="space-y-2">
              {[...events].reverse().slice(0, 5).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-red-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-500 tabular-nums w-6 shrink-0">{ev.minute !== null ? `${ev.minute}'` : '—'}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">
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
                      <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[200px]">
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
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions rapides</p>
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
                  <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{awayTeam.name}</span>
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
    </>
  )
}

