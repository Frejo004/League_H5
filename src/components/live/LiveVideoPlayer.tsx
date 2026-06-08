import { useEffect, useRef, useState, useCallback } from 'react'
import { useWebRTCViewer } from '@/hooks/useWebRTCStream'
import {
  Eye, Volume2, VolumeX, Maximize, Minimize,
  Play, Pause, FastForward, Rewind, Radio,
} from 'lucide-react'
import type { MatchEvent, TeamRef } from '@/types/database'

interface MatchOverlayInfo {
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  clockLabel: string
  period: string
  isPaused: boolean
  homeColor?: string
  awayColor?: string
  viewerCount?: number
}

interface LiveVideoPlayerProps {
  matchId: string
  stream?: MediaStream | null
  isLive?: boolean
  /** Forcer le mode spectateur (contrôles DVR visibles). Par défaut : true si stream/isLive non fournis */
  viewerMode?: boolean
  overlay?: MatchOverlayInfo
  events?: MatchEvent[]
  homeTeam?: TeamRef
  awayTeam?: TeamRef
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function LiveVideoPlayer({
  matchId,
  stream: propStream,
  isLive: propIsLive,
  viewerMode,
  overlay,
  events,
  homeTeam,
  awayTeam,
}: LiveVideoPlayerProps) {
  // Si stream/isLive sont fournis depuis l'extérieur ET viewerMode n'est pas explicitement true
  // → on est en mode admin (pas de DVR)
  // Si viewerMode=true OU si rien n'est fourni → mode spectateur (DVR actif)
  const isAdminMode = propIsLive !== undefined && propStream !== undefined && viewerMode !== true

  // ── Refs déclarés AVANT useWebRTCViewer pour pouvoir les passer au hook ──
  const videoRef    = useRef<HTMLVideoElement>(null)
  const dvrVideoRef = useRef<HTMLVideoElement>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const localViewer = useWebRTCViewer(isAdminMode ? '' : matchId)

  const isLive      = propIsLive  !== undefined ? propIsLive  : localViewer.isLive
  const stream      = propStream  !== undefined ? propStream  : localViewer.stream

  // Mode spectateur = DVR disponible
  const isViewerMode = !isAdminMode

  // En mode viewer, le viewerCount vient toujours du localViewer (connexion interne)
  // En mode admin, il peut venir de l'overlay ou du localViewer
  const viewerCount = isViewerMode
    ? localViewer.viewerCount
    : (overlay?.viewerCount !== undefined ? overlay.viewerCount : localViewer.viewerCount)

  const { dvrEnabled, seekDvr, dvrBlobUrl, dvrDuration } = isViewerMode
    ? localViewer
    : { dvrEnabled: false, seekDvr: () => {}, dvrBlobUrl: null, dvrDuration: 0 }

  // AJOUT : récupérer l'état "stream plein" pour l'afficher à l'utilisateur
  const isStreamFull = isViewerMode ? localViewer.isStreamFull : false
  const connectionState = isViewerMode ? localViewer.connectionState : 'idle'

  // Détection fin de match (Admin parti)
  const matchEnded = isViewerMode && isLive && !stream && connectionState === 'connected'

  // ── Refs ────────────────────────────────────────────────────────────────────

  // ── State ───────────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted]             = useState(true)
  const [isFullscreen, setIsFullscreen]   = useState(false)
  const [isStalled, setIsStalled]         = useState(false)
  const [isPausedDvr, setIsPausedDvr]     = useState(false)
  const [dvrSlider, setDvrSlider]         = useState(0)   // 0 = live, >0 = retard en secondes
  const [showControls, setShowControls]   = useState(true)
  const [dvrReady, setDvrReady]           = useState(false)
  // Transition croisée live ⇄ DVR : true pendant ~300ms pour le fondu
  const [dvrTransitioning, setDvrTransitioning] = useState(false)

  // ── Ajustement d'état lors du changement de mode DVR (pattern Render-time reset) ──
  const [prevDvrEnabled, setPrevDvrEnabled] = useState(dvrEnabled)
  if (dvrEnabled !== prevDvrEnabled) {
    setPrevDvrEnabled(dvrEnabled)
    if (!dvrEnabled) {
      setIsPausedDvr(false)
      setDvrReady(false)
    }
  }

  // ── DVR : auto-progression du curseur via onTimeUpdate ─────────────────────
  // Déclaré APRÈS les useState pour ne pas violer les règles de lint TDZ
  // et exhaustivedeps sur setDvrSlider / setIsPausedDvr.
  const handleDvrTimeUpdate = useCallback(() => {
    const video = dvrVideoRef.current
    if (!video || !dvrEnabled) return
    if (video.buffered.length === 0) return

    const bufferedEnd  = video.buffered.end(video.buffered.length - 1)
    const delay        = Math.max(0, Math.round(bufferedEnd - video.currentTime))
    setDvrSlider(delay)

    // Catch-up automatique : si on rattrape le direct (≤ 1s de retard)
    if (delay <= 1 && !isPausedDvr) {
      setDvrSlider(0)
      seekDvr(0)
    }
  }, [dvrEnabled, isPausedDvr, seekDvr])

  // ── Bandeau but ───────────────────────────────────────────────────────────
  const [activeGoalBanner, setActiveGoalBanner] = useState<{
    playerName: string; teamName: string; teamColor: string
    isOwnGoal: boolean; score: string; minute: number
  } | null>(null)

  // CORRECTIF : initialisation synchrone avec les buts déjà présents au montage
  // pour éviter que les buts historiques déclenchent le bandeau au rechargement.
  const goalEventsRef = useRef<Set<string>>(
    new Set(
      events
        ?.filter(e => e.type === 'goal' || e.type === 'own_goal')
        .map(e => e.id) ?? []
    )
  )

  useEffect(() => {
    if (!events) return
    const goals = events.filter(e => e.type === 'goal' || e.type === 'own_goal')
    const newGoal = goals.find(g => !goalEventsRef.current.has(g.id))
    if (!newGoal) return
    goalEventsRef.current.add(newGoal.id)
    const isHome = newGoal.team_id === homeTeam?.id
    setActiveGoalBanner({
      playerName: newGoal.player ? `${newGoal.player.first_name} ${newGoal.player.last_name}` : 'Équipe',
      teamName:  isHome ? (homeTeam?.name || 'DOMICILE') : (awayTeam?.name || 'EXTÉRIEUR'),
      teamColor: isHome ? (homeTeam?.color || '#3b82f6') : (awayTeam?.color || '#f59e0b'),
      isOwnGoal: newGoal.type === 'own_goal',
      score: `${overlay?.homeScore ?? 0} - ${overlay?.awayScore ?? 0}`,
      minute: newGoal.minute ?? 0,
    })
    const t = setTimeout(() => setActiveGoalBanner(null), 7000)
    return () => clearTimeout(t)
  }, [events, homeTeam, awayTeam, overlay])

  // ── Attacher le stream live ───────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!stream) { video.srcObject = null; return }
    if (video.srcObject === stream) return
    video.srcObject = stream
    video.play().catch(err => { if (err.name !== 'AbortError') console.warn('play error:', err) })
  }, [stream, isLive])

  // ── Effet 1 : Chargement de la SOURCE DVR + démarrage lecture ───────────────
  // dvrBlobUrl est réactif : il change quand seekDvr() construit un nouveau MediaSource/Blob.
  useEffect(() => {
    const video = dvrVideoRef.current
    if (!video) return
    if (!dvrEnabled) {
      // Nettoyage proactif du décodeur : libère la mémoire GPU/CPU immédiatement
      video.pause()
      video.removeAttribute('src')
      video.load()
      console.debug('📡 [DVR] Décodeur libéré — retour au live')
      return
    }
    const url = dvrBlobUrl
    if (!url || video.src === url) return

    // Déclencher la transition cross-fade avant de charger la nouvelle source
    setDvrTransitioning(true)

    video.src = url
    video.load()

    // Démarrer la lecture dès que suffisamment de données sont disponibles.
    // On écoute plusieurs événements pour couvrir tous les navigateurs :
    // - 'canplay' : données suffisantes pour démarrer (Chrome, Firefox)
    // - 'loadeddata' : premier frame décodé (Safari, iOS)
    const tryPlay = () => {
      video.play().catch(err => {
        if (err.name !== 'AbortError') console.warn('📡 [DVR] play error:', err)
      })
      // Fin de la transition cross-fade après un court délai
      setTimeout(() => setDvrTransitioning(false), 280)
    }

    if (video.readyState >= 2) {
      // Données déjà disponibles (seek rapide)
      tryPlay()
    } else {
      video.addEventListener('canplay',    tryPlay, { once: true })
      video.addEventListener('loadeddata', tryPlay, { once: true })
    }

    return () => {
      video.removeEventListener('canplay',    tryPlay)
      video.removeEventListener('loadeddata', tryPlay)
    }
  }, [dvrEnabled, dvrBlobUrl])

  // ── Effet 2 : Contrôle LECTURE/PAUSE DVR séparé de la source ─────────────
  useEffect(() => {
    const video = dvrVideoRef.current
    if (!video || !dvrEnabled) return

    if (isPausedDvr) {
      video.pause()
    } else {
      // Ne relancer la lecture que si la vidéo est vraiment en pause
      // (évite de re-appeler play() pendant qu'elle joue déjà)
      if (video.paused) {
        const tryPlay = () => {
          video.play().catch(err => {
            if (err.name !== 'AbortError') console.warn('📡 [DVR] play error:', err)
          })
        }
        if (video.readyState >= 2) {
          tryPlay()
        } else {
          video.addEventListener('canplay', tryPlay, { once: true })
          return () => video.removeEventListener('canplay', tryPlay)
        }
      }
    }
  }, [dvrEnabled, isPausedDvr])

  // ── Visibilité DVR : éviter l'écran noir pendant le chargement ───────────
  // On n'affiche la vidéo DVR que quand elle joue réellement (readyState ≥ 2)
  useEffect(() => {
    const video = dvrVideoRef.current
    if (!video) return
    if (!dvrEnabled) return
    const onPlaying = () => setDvrReady(true)
    const onWaiting = () => setDvrReady(false)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
    }
  }, [dvrEnabled])

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(console.error)
    } else {
      document.exitFullscreen()
    }
  }

  // ── Auto-hide des contrôles après 3s d'inactivité ────────────────────────
  const resetControlsTimer = useCallback((forceVisible = true) => {
    if (forceVisible) setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    // Start hide timer on mount without forcing visibility
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000)
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }
  }, [])

  // ── DVR : reculer de 10s ──────────────────────────────────────────────────
  const rewind10 = useCallback(() => {
    const next = Math.min(dvrSlider + 10, dvrDuration)
    setDvrSlider(next)
    seekDvr(next)
  }, [dvrSlider, dvrDuration, seekDvr])

  // ── DVR : avancer de 10s (vers le live) ──────────────────────────────────
  const forward10 = useCallback(() => {
    const next = Math.max(dvrSlider - 10, 0)
    setDvrSlider(next)
    seekDvr(next)
    if (next === 0) setIsPausedDvr(false)
  }, [dvrSlider, seekDvr])

  // ── DVR : pause / reprise ─────────────────────────────────────────────────
  const togglePauseDvr = useCallback(() => {
    const video = dvrVideoRef.current
    if (!video) return
    if (isPausedDvr) {
      video.play().catch(() => {})
      setIsPausedDvr(false)
    } else {
      video.pause()
      setIsPausedDvr(true)
    }
  }, [isPausedDvr])

  // ── DVR : retour au live ──────────────────────────────────────────────────
  const goLive = useCallback(() => {
    setDvrSlider(0)
    seekDvr(0)
    setIsPausedDvr(false)
  }, [seekDvr])

  // ── Pause live → bascule automatiquement en mode DVR ────────────────────
  // Cela évite de perdre des images : on commence le DVR avec 1s de retard
  const togglePauseLive = useCallback(() => {
    if (!stream) return
    if (dvrEnabled) {
      // Déjà en DVR — revenir au live
      setDvrSlider(0)
      seekDvr(0)
      setIsPausedDvr(false)
    } else {
      // Basculer en DVR avec 1s de retard et mettre en pause
      const offset = Math.max(dvrDuration > 0 ? 1 : 0, 1)
      setDvrSlider(offset)
      seekDvr(offset)
      setIsPausedDvr(true)
    }
  }, [stream, dvrEnabled, dvrDuration, seekDvr])

  // ── Calculer si la vidéo live est en pause ────────────────────────────────
  const isLivePaused = !dvrEnabled && isPausedDvr

  if (!isLive) {
    const homeColor = homeTeam?.color || overlay?.homeColor || '#3b82f6'
    const awayColor = awayTeam?.color || overlay?.awayColor || '#ef4444'
    return ( 
      <div className="mx-1 sm:mx-0 relative rounded-4xl overflow-hidden border border-surface-border shadow-2xl bg-surface-card aspect-video mt-6 flex flex-col items-center justify-center gap-4 select-none">
        {/* Dynamic mesh decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div
            className="absolute -left-1/4 -top-1/4 w-3/4 h-[150%] blur-[100px]"
            style={{ backgroundColor: homeColor }}
          />
          <div
            className="absolute -right-1/4 -bottom-1/4 w-3/4 h-[150%] blur-[100px]"
            style={{ backgroundColor: awayColor }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface/5 border border-surface-border shadow-xl">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mt-1">
            En attente du signal vidéo
          </h3>
          <p className="text-[10px] font-bold text-text-secondary max-w-sm uppercase tracking-wider leading-relaxed">
            La diffusion n'a pas encore commencé.<br />
            Dès que le caméraman sera en ligne, le direct s'affichera automatiquement ici.
          </p>

          <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-surface/5 border border-surface-border backdrop-blur-md mt-2">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
              Mode Spectateur WebRTC
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Timeline inversée : gauche = passé, droite = direct (0s de retard) ───
  // progressPercent = 100% quand on est au direct, 0% au début du buffer
  const progressPercent = dvrDuration > 0 ? ((dvrDuration - dvrSlider) / dvrDuration) * 100 : 100

  return (
    <div
      ref={wrapperRef}
      onMouseMove={() => resetControlsTimer()}
      onTouchStart={() => resetControlsTimer()} 
      className="mx-1 sm:mx-0 relative rounded-4xl overflow-hidden border border-surface-border/10 shadow-2xl bg-surface aspect-video mt-6 select-none"
    >
      {/* ── Spinner connexion ─────────────────────────────────────────────── */}
      {!stream && !isStreamFull && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-card z-10 gap-3">
          {connectionState === 'failed' ? (
            <> 
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <span className="text-red-400 text-lg font-black">!</span>
              </div>
              <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">Connexion impossible</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center px-6">
                Problème réseau (NAT/TURN).<br />Nouvelle tentative en cours...
              </p>
            </>
          ) : ( 
            <>
              <div className="w-8 h-8 rounded-full border-2 border-[#C8F135] border-t-transparent animate-spin" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {connectionState === 'connecting' ? 'Connexion en cours...' : 'Connexion au direct...'}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Overlay stream complet ────────────────────────────────────────── */}
      {isStreamFull && !stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-card z-10 gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Eye size={18} className="text-amber-400" />
          </div>
          <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Direct complet</p>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center px-6">
            Le nombre maximum de spectateurs est atteint.<br />Réessayez dans quelques instants.
          </p>
        </div>
      )}

      {/* ── Overlay reconnexion ───────────────────────────────────────────── */}
      {stream && isStalled && !dvrEnabled && !isLivePaused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/60 backdrop-blur-md z-30">
          <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-2" />
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Reconnexion au direct...</p>
        </div>
      )}

      {/* ── Vidéo live — cross-fade fluide vers DVR ────────────────────────── */}
      <video
        ref={videoRef}
        autoPlay playsInline muted={isMuted}
        onWaiting={() => setIsStalled(true)}
        onPlaying={() => setIsStalled(false)}
        onStalled={() => setIsStalled(true)}
        onSuspend={() => setIsStalled(false)} 
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
          (dvrEnabled && dvrReady)
            ? 'opacity-0 pointer-events-none scale-[1.01] blur-[2px]'
            : dvrTransitioning
              ? 'opacity-50 blur-[1px]'
              : 'opacity-100'
        }`}
      />

      {/* ── Vidéo DVR — cross-fade depuis le live ─────────────────────────── */}
      <video
        ref={dvrVideoRef}
        playsInline muted={isMuted}
        data-dvr="true"
        onTimeUpdate={handleDvrTimeUpdate}
        onLoadedMetadata={() => {
          // Forcer la tête de lecture au début du buffer disponible
          // (MediaSource en mode segments ne le fait pas automatiquement)
          const video = dvrVideoRef.current
          if (!video) return
          if (video.buffered.length > 0) {
            video.currentTime = video.buffered.start(0)
          }
        }}
        className={`absolute inset-0 w-full h-full object-contain bg-black transition-all duration-500 ${
          (dvrEnabled && dvrReady)
            ? dvrTransitioning ? 'opacity-0' : 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Overlay Fin de Match ──────────────────────────────────────────── */} 
      {matchEnded && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/20">
            <Radio size={32} className="text-white/50" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Match Terminé</h3>
          <p className="text-sm text-slate-400 max-w-60">Merci d'avoir suivi ce live ! Les statistiques finales sont disponibles sur la fiche du match.</p>
        </div>
      )}

      {/* ── Spinner chargement DVR ────────────────────────────────────────── */}
      {dvrEnabled && !dvrReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/60 z-10">
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-2" />
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Chargement du replay...</p>
        </div>
      )}

      {/* ── Bandeau but ───────────────────────────────────────────────────── */}
      {activeGoalBanner && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 animate-in zoom-in-75 fade-in duration-300">
          <div
            className="px-6 py-3 rounded-2xl border shadow-2xl text-center"
            style={{ backgroundColor: `${activeGoalBanner.teamColor}22`, borderColor: `${activeGoalBanner.teamColor}66` }}
          >
            <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em] mb-0.5">
              {activeGoalBanner.isOwnGoal ? 'CSC' : 'BUT'} — {activeGoalBanner.minute}'
            </p>
            <p className="text-xl font-black text-white uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {activeGoalBanner.playerName}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: activeGoalBanner.teamColor }}>
              {activeGoalBanner.teamName}
            </p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {activeGoalBanner.score}
            </p>
          </div>
        </div>
      )}

{/* ══════════════════════════════════════════════════════════════════════
           OVERLAY SCOREBOARD (haut) - Enhanced for better visibility
       ══════════════════════════════════════════════════════════════════════ */}
       {stream && overlay && (
         <div className="absolute top-0 inset-x-0 z-20 px-3 pt-3 flex items-center justify-between gap-2"> 
           <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-[35%] shadow-lg">
             <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: overlay.homeColor ?? '#3b82f6' }} />
             <span className="text-[10px] font-black text-white uppercase truncate tracking-wide drop-shadow">{overlay.homeName}</span>
           </div>
           <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/15 shadow-lg">
             <span className="text-base font-black text-white tabular-nums drop-shadow" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{overlay.homeScore}</span>
             <span className="text-[10px] text-slate-400 font-bold mx-0.5">-</span>
             <span className="text-base font-black text-white tabular-nums drop-shadow" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{overlay.awayScore}</span>
           </div>
           <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-[35%] flex-row-reverse shadow-lg">
             <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: overlay.awayColor ?? '#f59e0b' }} />
             <span className="text-[10px] font-black text-white uppercase truncate tracking-wide drop-shadow">{overlay.awayName}</span>
           </div> 
         </div>
       )}

{/* ══════════════════════════════════════════════════════════════════════
           CONTRÔLES BAS — plus visibles, toujours accessibles
       ══════════════════════════════════════════════════════════════════════ */}
       {stream && (
         <div
           className={`absolute bottom-0 inset-x-0 z-20 transition-opacity duration-300 ${showControls || dvrEnabled || isLivePaused ? 'opacity-100' : 'opacity-0'}`}
         >
           {/* Dégradé de fond pour lisibilité */} 
           <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

           <div className="relative px-3 pb-3 pt-8 flex flex-col gap-2">

             {/* ── TIMELINE DVR ─────────────────────────────────────────────
                 Gauche = passé (max retard), droite = direct (0s de retard).
                 progressPercent=100% = au direct, 0% = début du buffer.
             ──────────────────────────────────────────────────────────────── */}
             {isViewerMode && (
               <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"> 
                 {/* Label "EN DIRECT" ou bouton retour au live */}
                 {dvrSlider === 0 ? (
                   <div className="flex items-center gap-1 bg-red-500/90 px-2 py-0.5 rounded-md shrink-0">
                     <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                     <span className="text-[8px] font-black text-white uppercase tracking-widest">DIRECT</span>
                   </div>
                 ) : (
                   <button
                     onClick={goLive}
                     className="flex items-center gap-1 bg-red-500/90 hover:bg-red-500 px-2 py-0.5 rounded-md shrink-0 transition-colors active:scale-95"
                     title="Revenir au direct" 
                   >
                     <Radio size={8} className="text-white" />
                     <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
                   </button>
                 )}

                 {/* Barre de progression — gauche=passé, droite=live */}
                 <div className="relative flex-1 h-5 flex items-center group cursor-pointer"> 
                   {/* Track fond */}
                   <div className="absolute inset-x-0 h-1 rounded-full bg-white/20" />
                   {/* Track buffer disponible */}
                   <div className="absolute left-0 h-1 rounded-full bg-white/40" style={{ width: '100%' }} />
                   {/* Track progressé : de la gauche jusqu'à la position actuelle */}
                   <div
                     className={`absolute left-0 h-1 rounded-full transition-all ${dvrSlider === 0 ? 'bg-red-500' : 'bg-amber-400'}`}
                     style={{ width: `${progressPercent}%` }}
                   />
                   {/* Input range : valeur inversée → max=gauche(passé), 0=droite(live) */}
                   <input
                     type="range"
                     min={0}
                     max={Math.max(dvrDuration, 1)}
                     value={dvrDuration - dvrSlider}
                     onChange={(e) => {
                       const invertedVal = dvrDuration - parseInt(e.target.value)
                       const clamped = Math.max(0, Math.min(dvrDuration, invertedVal))
                       setDvrSlider(clamped)
                       seekDvr(clamped)
                     }}
                     className="absolute inset-0 w-full opacity-0 cursor-pointer h-5"
                     title={dvrSlider === 0 ? 'En direct' : `Retard : -${formatSeconds(dvrSlider)}`}
                   />
                   {/* Curseur visible aligné sur progressPercent */}
                   <div
                     className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-lg transition-all pointer-events-none ${dvrSlider === 0 ? 'bg-red-500' : 'bg-amber-400'}`}
                     style={{ left: `calc(${progressPercent}% - 6px)` }}
                   />
                 </div>

                 {/* Temps de retard */}
                 <span className="text-[9px] font-black tabular-nums shrink-0 w-12 text-right text-text-primary">
                   {dvrSlider === 0 ? 'LIVE' : `-${formatSeconds(dvrSlider)}`}
                 </span>
               </div>
             )}

             {/* ── BADGE DE LATENCE ET STABILITÉ CONNEXION ──────────────── */}
             {isViewerMode && stream && (
               <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400"> 
                 {/* Indicateur statut connexion */}
                 <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-500 ${
                   connectionState === 'connected'
                     ? 'bg-[#C8F135]/10 border border-[#C8F135]/20 text-[#C8F135]'
                     : connectionState === 'connecting'
                     ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                     : 'bg-red-500/10 border border-red-500/20 text-red-400'
                 }`}>
                   <span className={`w-1.5 h-1.5 rounded-full ${
                     connectionState === 'connected'
                       ? 'bg-[#C8F135] animate-pulse'
                       : connectionState === 'connecting'
                       ? 'bg-amber-400 animate-pulse'
                       : 'bg-red-400'
                   }`} />
                   <span>{
                     connectionState === 'connected' ? 'WebRTC Direct'
                     : connectionState === 'connecting' ? 'Connexion...'
                     : 'Reconnexion'
                   }</span>
                 </div>
 
                 {/* Indicateur retard DVR actif */}
                 {dvrSlider > 0 && (
                   <button
                     onClick={goLive}
                     className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-400 uppercase tracking-widest hover:bg-amber-500/20 transition-all animate-pulse active:scale-95"
                   > 
                     <Radio size={8} />
                     <span>Rattraper le direct</span>
                   </button>
                 )}
               </div>
             )}

             {/* ── BARRE DE CONTRÔLES AMÉLIORÉE ────────────────────────────────────── */}
             <div className="flex items-center justify-between gap-2 bg-black/60 backdrop-blur-md px-2 py-2 rounded-xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
 
               {/* Gauche : chrono + période (si overlay) */}
               {overlay ? (
                 <div className="flex items-center gap-2">
                   <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${overlay.isPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
                   <span className="text-[11px] font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                     {overlay.clockLabel}
                   </span>
                   <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest border-l border-surface-border/20 pl-2">
                     {overlay.isPaused ? 'SUSPENDU' : overlay.period}
                   </span>
                 </div>
               ) : (
                 <div /> /* spacer */
               )}
 
               {/* Centre : contrôles de lecture DVR (viewer uniquement) */}
               {isViewerMode && (
                 <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl border border-white/20">
                   {/* Reculer 10s */}
                   <button
                     onClick={rewind10}
                     disabled={dvrDuration === 0 || dvrSlider === dvrDuration}
                     className="flex items-center justify-center w-7 h-7 rounded-lg text-text-primary hover:text-white hover:bg-white/20 transition-all disabled:opacity-30"
                     title="Reculer 10 secondes"
                   >
                     <Rewind size={13} />
                   </button>

                   {/* Pause / Lecture */}
                   <button
                     onClick={dvrEnabled ? togglePauseDvr : togglePauseLive} 
                     className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95"
                     title={isPausedDvr || isLivePaused ? 'Reprendre' : 'Pause'}
                   >
                     {isPausedDvr || isLivePaused
                       ? <Play size={14} className="ml-0.5" />
                       : <Pause size={14} />
                     }
                   </button>

                   {/* Avancer 10s (vers le live) */}
                   <button
                     onClick={forward10}
                     disabled={dvrSlider === 0}
                     className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30"
                     title="Avancer 10 secondes"
                   >
                     <FastForward size={13} />
                   </button>
                 </div>
               )}

               {/* Droite : spectateurs + son + plein écran */}
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black text-slate-300 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg">
                   <Eye size={12} className="text-[#C8F135] shrink-0 drop-shadow" /> {viewerCount}
                 </span>
                 <button
                   onClick={() => setIsMuted(!isMuted)}
                   className="p-0.5 text-slate-300 hover:text-white transition-colors border-l border-white/10 pl-2 active:scale-95"
                   title={isMuted ? 'Activer le son' : 'Couper le son'}
                 >
                   {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-[#C8F135]" />}
                 </button>
                 <button
                   onClick={toggleFullscreen}
                   className="p-0.5 text-slate-300 hover:text-white transition-colors border-l border-white/10 pl-2 active:scale-95"
                   title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                 >
                   {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                 </button>
               </div>
             </div>

           </div>
         </div>
       )}
    </div>
  )
}
