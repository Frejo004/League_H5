import { useEffect, useRef, useState } from 'react'
import { useWebRTCViewer } from '@/hooks/useWebRTCStream'
import { Eye, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'

interface MatchOverlayInfo {
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  clockLabel: string   // ex: "12'34\""
  period: string       // ex: "1ère MT" | "2ème MT" | "Mi-temps"
  isPaused: boolean
  homeColor?: string
  awayColor?: string
  viewerCount?: number
}

interface LiveVideoPlayerProps {
  matchId: string
  stream?: MediaStream | null
  isLive?: boolean
  overlay?: MatchOverlayInfo
}

export function LiveVideoPlayer({
  matchId,
  stream: propStream,
  isLive: propIsLive,
  overlay,
}: LiveVideoPlayerProps) {
  const localViewer = useWebRTCViewer(propIsLive !== undefined ? '' : matchId)

  const isLive = propIsLive !== undefined ? propIsLive : localViewer.isLive
  const stream  = propStream  !== undefined ? propStream  : localViewer.stream
  const viewerCount = overlay?.viewerCount !== undefined ? overlay.viewerCount : localViewer.viewerCount

  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isStalled, setIsStalled] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!stream) { video.srcObject = null; return }
    if (video.srcObject === stream) return
    video.srcObject = stream
    video.play().catch(err => {
      if (err.name !== 'AbortError') console.warn('LiveVideoPlayer play error:', err)
    })
  }, [stream, isLive])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  if (!isLive) return null

  return (
    <div
      ref={wrapperRef}
      className="mx-1 sm:mx-0 relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video mt-6 select-none"
    >

      {/* Spinner connexion */}
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
          <div className="w-8 h-8 rounded-full border-2 border-[#C8F135] border-t-transparent animate-spin mb-3" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connexion au direct...</p>
        </div>
      )}

      {/* Overlay Reconnexion si flux interrompu */}
      {stream && isStalled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30 transition-all">
          <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-2" />
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Reconnexion au direct...</p>
        </div>
      )}

      {/* Vidéo P2P */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        onWaiting={() => setIsStalled(true)}
        onPlaying={() => setIsStalled(false)}
        onStalled={() => setIsStalled(true)}
        onSuspend={() => setIsStalled(false)}
        className="absolute inset-0 w-full h-full border-0 object-cover"
      />

      {/* ── Overlay scoreboard (affiché dès que stream est présent) ── */}
      {stream && overlay && (
        <>
          {/* Barre du haut : équipes + score */}
          <div className="absolute top-0 inset-x-0 z-20 px-3 pt-3 flex items-center justify-between gap-2">
            {/* Équipe domicile */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-[35%]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: overlay.homeColor ?? '#3b82f6' }}
              />
              <span className="text-[10px] font-black text-white uppercase truncate tracking-wide">
                {overlay.homeName}
              </span>
            </div>

            {/* Score central */}
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/20 shadow-lg">
              <span className="text-base font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {overlay.homeScore}
              </span>
              <span className="text-[10px] text-slate-400 font-bold mx-0.5">-</span>
              <span className="text-base font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {overlay.awayScore}
              </span>
            </div>

            {/* Équipe extérieure */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-[35%] flex-row-reverse">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: overlay.awayColor ?? '#f59e0b' }}
              />
              <span className="text-[10px] font-black text-white uppercase truncate tracking-wide">
                {overlay.awayName}
              </span>
            </div>
          </div>

          {/* Barre du bas : chrono + période + badge EN DIRECT */}
          <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3 flex items-center justify-between">
            {/* Chrono + période */}
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${overlay.isPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[11px] font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {overlay.clockLabel}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest border-l border-white/20 pl-2">
                {overlay.isPaused ? 'SUSPENDU' : overlay.period}
              </span>
            </div>

            {/* Badge EN DIRECT + Spectateurs + Contrôles Custom */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-1 bg-red-500/90 px-2 py-0.5 rounded-md border border-red-400/30">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">DIRECT</span>
                </div>
                <span className="text-[9px] font-black text-slate-300 tracking-wider flex items-center gap-1.5 border-r border-white/10 pr-2.5">
                  <Eye size={12} className="text-[#C8F135] shrink-0" /> {viewerCount}
                </span>
                
                {/* Custom volume control */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-0.5 text-slate-300 hover:text-white transition-colors"
                  title={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-[#C8F135]" />}
                </button>

                {/* Custom fullscreen toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-0.5 text-slate-300 hover:text-white transition-colors border-l border-white/10 pl-2"
                  title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Badge EN DIRECT simple si pas d'overlay */}
      {stream && !overlay && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30 z-20">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">EN DIRECT</span>
          <span className="text-[10px] font-black text-slate-300 border-l border-white/20 pl-2 pr-1.5 flex items-center gap-1.5">
            <Eye size={12} className="text-[#C8F135]" /> {viewerCount}
          </span>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-0.5 text-slate-300 hover:text-white transition-colors border-l border-white/10 pl-2"
            title={isMuted ? "Activer le son" : "Couper le son"}
          >
            {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-[#C8F135]" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-0.5 text-slate-300 hover:text-white transition-colors border-l border-white/10 pl-2"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          </button>
        </div>
      )}
    </div>
  )
}
