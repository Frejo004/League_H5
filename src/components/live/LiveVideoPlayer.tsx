import { useWebRTCViewer } from '@/hooks/useWebRTCStream'

export function LiveVideoPlayer({ matchId }: { matchId: string }) {
  const { stream, isLive } = useWebRTCViewer(matchId)

  if (!isLive) return null

  return (
    <div className="mx-1 sm:mx-0 relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video animate-fade-in-up mt-6">
      {!stream ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
          <div className="w-8 h-8 rounded-full border-2 border-[#C8F135] border-t-transparent animate-spin mb-3" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connexion au direct...</p>
        </div>
      ) : (
        <>
          <video 
            autoPlay 
            playsInline
            controls
            className="absolute inset-0 w-full h-full border-0 object-cover"
            ref={(v) => { if (v) v.srcObject = stream }}
          />
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">EN DIRECT</span>
          </div>
        </>
      )}
    </div>
  )
}
