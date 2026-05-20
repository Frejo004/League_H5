/**
 * BroadcastOverlay — Overlay plein écran / PiP pour le broadcast admin
 *
 * 3 modes :
 *  - 'fullscreen' : plein écran avec les contrôles live superposés
 *  - 'pip'        : fenêtre flottante draggable (coin bas-droite), live continue
 *  - 'hidden'     : overlay fermé (preview inline dans AdminLiveControls)
 *
 * Le stream vidéo ne s'arrête jamais lors des transitions entre modes.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Minimize2, Maximize2, X, FlipHorizontal,
  Eye, Volume2, VolumeX, Square,
} from 'lucide-react'
import type { MatchEvent, TeamRef } from '@/types/database'

type OverlayMode = 'fullscreen' | 'pip' | 'hidden'

interface BroadcastOverlayProps {
  stream: MediaStream | null
  isBroadcasting: boolean
  viewerCount: number
  networkQuality: 'good' | 'degraded' | 'poor'
  facingMode: 'environment' | 'user'
  clockLabel: string
  homeTeam: TeamRef
  awayTeam: TeamRef
  homeScore: number
  awayScore: number
  isPaused: boolean
  onSwitchCamera: () => void
  onStopBroadcast: () => void
  /** Slot pour les actions live (buts, cartons…) en mode plein écran */
  actionsSlot?: React.ReactNode
}

const NETWORK_STYLES = {
  good:     { dot: 'bg-green-400',  text: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/20',  label: 'Réseau OK' },
  degraded: { dot: 'bg-amber-400',  text: 'text-amber-400',  border: 'border-amber-400/30',  bg: 'bg-amber-500/20',  label: 'Réseau moyen' },
  poor:     { dot: 'bg-red-400',    text: 'text-red-400',    border: 'border-red-500/30',    bg: 'bg-red-500/20',    label: 'Réseau faible' },
}

export function BroadcastOverlay({
  stream, isBroadcasting, viewerCount, networkQuality,
  facingMode, clockLabel, homeTeam, awayTeam,
  homeScore, awayScore, isPaused,
  onSwitchCamera, onStopBroadcast, actionsSlot,
}: BroadcastOverlayProps) {
  const [mode, setMode] = useState<OverlayMode>('hidden')
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs vidéo — un par mode pour éviter les conflits srcObject
  const fsVideoRef  = useRef<HTMLVideoElement>(null) // plein écran
  const pipVideoRef = useRef<HTMLVideoElement>(null) // PiP

  // Drag PiP
  const pipRef      = useRef<HTMLDivElement>(null)
  const dragRef     = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 }) // distance depuis bas-droite

  // ── Passer en plein écran dès que le broadcast démarre ───────────────────
  useEffect(() => {
    if (isBroadcasting && stream) {
      setMode('fullscreen')
    } else if (!isBroadcasting) {
      setMode('hidden')
    }
  }, [isBroadcasting, stream])

  // ── Attacher le stream au bon élément vidéo selon le mode ────────────────
  const attachStream = useCallback((videoEl: HTMLVideoElement | null) => {
    if (!videoEl || !stream) return
    if (videoEl.srcObject === stream) return
    videoEl.srcObject = stream
    videoEl.play().catch(err => {
      if (err.name !== 'AbortError') console.warn('[BroadcastOverlay] play error', err)
    })
  }, [stream])

  useEffect(() => {
    if (mode === 'fullscreen') attachStream(fsVideoRef.current)
    if (mode === 'pip')        attachStream(pipVideoRef.current)
  }, [mode, stream, attachStream])

  // ── Sync mute sur les deux éléments ──────────────────────────────────────
  useEffect(() => {
    if (fsVideoRef.current)  fsVideoRef.current.muted  = isMuted
    if (pipVideoRef.current) pipVideoRef.current.muted = isMuted
  }, [isMuted])

  // ── Auto-hide des contrôles en plein écran ────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000)
  }, [])

  useEffect(() => {
    if (mode === 'fullscreen') resetControlsTimer()
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }
  }, [mode, resetControlsTimer])

  // ── Drag PiP ──────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!pipRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pipPos.x,
      origY: pipPos.y,
    }
  }, [pipPos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    // PiP est positionné depuis le coin bas-droite → inverser dx
    setPipPos({
      x: Math.max(8, dragRef.current.origX - dx),
      y: Math.max(8, dragRef.current.origY - dy),
    })
  }, [])

  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  const nq = NETWORK_STYLES[networkQuality]

  if (mode === 'hidden') return null

  // ══════════════════════════════════════════════════════════════════════════
  // MODE PLEIN ÉCRAN
  // ══════════════════════════════════════════════════════════════════════════
  if (mode === 'fullscreen') {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-black flex flex-col no-select"
        onPointerMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
      >
        {/* Vidéo — remplit tout l'écran, object-cover pour iPhone portrait */}
        <video
          ref={fsVideoRef}
          autoPlay playsInline muted={isMuted}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dégradé haut */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
        {/* Dégradé bas */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* ── BARRE HAUTE ─────────────────────────────────────────────────── */}
        <div 
          className={`absolute top-0 inset-x-0 z-10 px-4 flex items-center justify-between gap-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >

          {/* Score & Chrono & REC */}
          <div className="flex items-center gap-2">
            {/* Score */}
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: homeTeam.color }} />
              <span className="text-xs font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {homeScore} — {awayScore}
              </span>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: awayTeam.color }} />
            </div>

            {/* Chrono */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-xs font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {clockLabel}
              </span>
            </div>

            {/* Badge de transmission premium (REC) */}
            <div className="flex items-center gap-1.5 bg-red-500/20 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest font-['Barlow_Condensed']">
                REC
              </span>
            </div>
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-2">
            {/* Viewers */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
              <Eye size={11} className="text-[#C8F135]" />
              <span className="text-[10px] font-black text-slate-300">{viewerCount}</span>
            </div>

            {/* Réduire en PiP */}
            <button
              onClick={() => setMode('pip')}
              className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
              title="Réduire (continuer en arrière-plan)"
            >
              <Minimize2 size={15} />
            </button>

            {/* Arrêter */}
            <button
              onClick={onStopBroadcast}
              className="w-9 h-9 rounded-xl bg-red-500/80 border border-red-400/30 flex items-center justify-center text-white hover:bg-red-500 transition-all"
              title="Arrêter le live"
            >
              <Square size={13} />
            </button>
          </div>
        </div>

        {/* ── BARRE BASSE ─────────────────────────────────────────────────── */}
        <div 
          className={`absolute bottom-0 inset-x-0 z-10 px-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
        >

          {/* Qualité réseau & Indicateur de stabilité */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest ${nq.bg} ${nq.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${nq.dot}`} />
              <span className={nq.text}>{nq.label}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-[9px] font-black text-slate-300 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] animate-pulse" />
              <span>FLUX AUDIO/VIDÉO DIRECT</span>
            </div>
          </div>

          {/* Contrôles caméra */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={onSwitchCamera}
              className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              <FlipHorizontal size={13} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {facingMode === 'environment' ? 'Caméra avant' : 'Caméra arrière'}
              </span>
            </button>

            <button
              onClick={() => setIsMuted(m => !m)}
              className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-[#C8F135]" />}
            </button>
          </div>

          {/* Slot actions live (buts, cartons…) */}
          {actionsSlot && (
            <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 p-3 max-h-[45vh] overflow-y-auto">
              {actionsSlot}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE PiP — fenêtre flottante draggable
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={pipRef}
      className="fixed z-[9999] rounded-2xl overflow-hidden border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-black cursor-grab active:cursor-grabbing select-none"
      style={{
        width: 180,
        aspectRatio: '9/16',
        right: pipPos.x,
        bottom: pipPos.y,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <video
        ref={pipVideoRef}
        autoPlay playsInline muted={isMuted}
        className="w-full h-full object-cover pointer-events-none"
      />

      {/* Badge live */}
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500/90 px-1.5 py-0.5 rounded-md">
        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
        <span className="text-[7px] font-black text-white uppercase tracking-widest">LIVE</span>
      </div>

      {/* Viewers */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded-md">
        <Eye size={8} className="text-[#C8F135]" />
        <span className="text-[7px] font-black text-slate-300">{viewerCount}</span>
      </div>

      {/* Boutons bas */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-4 flex items-center justify-between">
        {/* Agrandir */}
        <button
          onClick={(e) => { e.stopPropagation(); setMode('fullscreen') }}
          className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all"
          title="Agrandir"
          onPointerDown={e => e.stopPropagation()}
        >
          <Maximize2 size={11} />
        </button>

        {/* Arrêter */}
        <button
          onClick={(e) => { e.stopPropagation(); onStopBroadcast() }}
          className="w-7 h-7 rounded-lg bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-all"
          title="Arrêter le live"
          onPointerDown={e => e.stopPropagation()}
        >
          <Square size={10} />
        </button>
      </div>
    </div>
  )
}
