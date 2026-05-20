import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── ICE servers : STUN public + TURN via Supabase Edge Function ─────────────
// Les credentials TURN Metered sont récupérés dynamiquement depuis une Edge
// Function Supabase qui détient la secret key. Jamais exposés dans le bundle.

function buildFallbackIceConfig(): RTCConfiguration {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      // Fallback TURN publics si l'Edge Function est indisponible
      { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  }
}

// Cache des credentials TURN — valides 50 min (Metered émet des tokens 1h)
let _cachedIceConfig: RTCConfiguration | null = null
let _cacheExpiry = 0

async function fetchIceConfig(): Promise<RTCConfiguration> {
  const now = Date.now()
  if (_cachedIceConfig && now < _cacheExpiry) return _cachedIceConfig

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const res = await fetch(`${supabaseUrl}/functions/v1/get-turn-credentials`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })

    if (!res.ok) throw new Error(`Edge Function error: ${res.status}`)

    const { iceServers } = await res.json()
    if (!Array.isArray(iceServers) || iceServers.length === 0) throw new Error('Empty iceServers')

    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...iceServers,
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    }

    _cachedIceConfig = config
    _cacheExpiry = now + 50 * 60 * 1000 // 50 minutes
    console.log('📡 [ICE] credentials loaded from Metered ✓')
    return config
  } catch (err) {
    console.warn('📡 [ICE] Edge Function unavailable, using fallback TURN', err)
    return buildFallbackIceConfig()
  }
}

// Config synchrone utilisée au premier appel (avant que fetchIceConfig réponde)
const ICE_CONFIG_FALLBACK = buildFallbackIceConfig()

// ── Contraintes vidéo adaptatives selon la qualité réseau ───────────────────
// On tente d'abord la qualité haute, puis on descend si la caméra/réseau refuse
const VIDEO_CONSTRAINTS_HIGH: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width:  { ideal: 854, max: 1280 },
  height: { ideal: 480, max: 720 },
  frameRate: { ideal: 24, max: 30 },
}

const VIDEO_CONSTRAINTS_MED: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width:  { ideal: 640, max: 854 },
  height: { ideal: 360, max: 480 },
  frameRate: { ideal: 15, max: 20 },
}

const VIDEO_CONSTRAINTS_LOW: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width:  { ideal: 320, max: 480 },
  height: { ideal: 240, max: 360 },
  frameRate: { ideal: 10, max: 15 },
}

// ── Nombre maximum de viewers simultanés (architecture P2P mesh) ────────────
// Au-delà, chaque viewer supplémentaire multiplie l'upload de l'émetteur.
// On refuse les connexions excédentaires et on notifie le viewer concerné.
const MAX_VIEWERS = 40



// ── Durée max du buffer DVR côté viewer (en secondes) ───────────────────────
const DVR_BUFFER_SECONDS = 300 // 5 minutes de retour en arrière possible
// Retourne 'high' | 'medium' | 'low' selon navigator.connection si disponible
function getNetworkQuality(): 'high' | 'medium' | 'low' {
  const conn = (navigator as any).connection
  if (!conn) return 'medium'
  const { effectiveType, downlink } = conn
  if (effectiveType === '4g' && downlink >= 2) return 'high'
  if (effectiveType === '4g' || (effectiveType === '3g' && downlink >= 1)) return 'medium'
  return 'low'
}

// ── Choisir le bitrate max selon la qualité réseau ──────────────────────────
function getMaxBitrate(): number {
  const q = getNetworkQuality()
  if (q === 'high') return 800_000   // 800 kbps
  if (q === 'medium') return 400_000 // 400 kbps
  return 150_000                     // 150 kbps (connexion faible)
}

// ── Appliquer les paramètres d'encodage après la poignée de main ─────────────
async function applyEncodingParams(pc: RTCPeerConnection) {
  const maxBitrate = getMaxBitrate()
  for (const sender of pc.getSenders()) {
    try {
      const params = sender.getParameters()
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}]
      }
      const enc = params.encodings[0]

      if (sender.track?.kind === 'video') {
        enc.maxBitrate    = maxBitrate
        enc.maxFramerate  = getNetworkQuality() === 'low' ? 10 : 15
        enc.priority      = 'medium'
        // scaleResolutionDownBy : le navigateur réduit la résolution si la bande passante est insuffisante
        enc.scaleResolutionDownBy = getNetworkQuality() === 'low' ? 2.0 : 1.0
      }

      if (sender.track?.kind === 'audio') {
        enc.priority         = 'high'
        enc.networkPriority  = 'high' as any
      }

      await sender.setParameters(params)
    } catch {
      // Certains navigateurs ne supportent pas tous les champs — on ignore silencieusement
    }
  }
  console.log(`📡 [BC] encoding params applied (${maxBitrate / 1000}kbps video, quality: ${getNetworkQuality()})`)
}

// ── Stocker les stats précédentes pour calculer des deltas ──────────────────
// Map<peerId, { lost: number; sent: number }> — clé = ssrc de la track vidéo
const _prevRtpStats = new WeakMap<RTCPeerConnection, { lost: number; sent: number }>()

// ── Adapter dynamiquement le bitrate selon les stats RTC ────────────────────
// Appelé toutes les 5s pour ajuster si la connexion se dégrade en cours de live.
// CORRECTIF : utilise des deltas (valeurs courantes − valeurs précédentes) au lieu
// des valeurs cumulatives brutes, qui faussaient le calcul du taux de perte.
async function adaptBitrateFromStats(pc: RTCPeerConnection) {
  try {
    const stats = await pc.getStats()
    let packetLossRate = 0
    let rtt = 0

    stats.forEach(report => {
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        const curLost = report.packetsLost ?? 0
        const curSent = report.packetsSent ?? 0
        const prev    = _prevRtpStats.get(pc) ?? { lost: 0, sent: 0 }

        const deltaLost = Math.max(0, curLost - prev.lost)
        const deltaSent = Math.max(0, curSent - prev.sent)

        // Mettre à jour les valeurs de référence pour le prochain intervalle
        _prevRtpStats.set(pc, { lost: curLost, sent: curSent })

        const total = deltaSent + deltaLost
        packetLossRate = total > 0 ? deltaLost / total : 0
      }
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime ?? 0
      }
    })

    // Si perte de paquets > 10% ou RTT > 500ms → réduire le bitrate
    if (packetLossRate > 0.1 || rtt > 0.5) {
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind !== 'video') continue
        const params = sender.getParameters()
        if (!params.encodings?.[0]) continue
        const current = params.encodings[0].maxBitrate ?? 400_000
        const reduced = Math.max(current * 0.7, 100_000) // -30%, min 100kbps
        params.encodings[0].maxBitrate = reduced
        params.encodings[0].scaleResolutionDownBy = reduced < 200_000 ? 2.0 : 1.0
        await sender.setParameters(params).catch(() => {})
        console.log(`📡 [BC] bitrate reduced to ${Math.round(reduced / 1000)}kbps (loss=${(packetLossRate * 100).toFixed(1)}%, rtt=${Math.round(rtt * 1000)}ms)`)
      }
    }
  } catch {
    // Ignore — stats non disponibles sur certains navigateurs
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// createPc() est maintenant async — charge les credentials TURN depuis Metered
// avant de créer la PeerConnection. Fallback immédiat si l'Edge Function est lente.
async function createPc(): Promise<RTCPeerConnection> {
  const config = await Promise.race([
    fetchIceConfig(),
    // Timeout 3s : si l'Edge Function ne répond pas, on utilise le fallback
    new Promise<RTCConfiguration>(resolve =>
      setTimeout(() => resolve(ICE_CONFIG_FALLBACK), 3_000)
    ),
  ])
  return new RTCPeerConnection(config)
}

// ── useWebRTCBroadcaster ──────────────────────────────────────────────────────
export function useWebRTCBroadcaster(matchId: string, options?: {
  /** Callback appelé à la place de alert() pour les erreurs caméra */
  onError?: (message: string, detail?: string) => void
  /** ID du device vidéo à utiliser (issu de enumerateDevices) */
  videoDeviceId?: string
  /** ID du device audio à utiliser (issu de enumerateDevices) */
  audioDeviceId?: string
}) {
  const { user } = useAuth()
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  // Qualité réseau estimée : 'good' | 'degraded' | 'poor'
  const [networkQuality, setNetworkQuality] = useState<'good' | 'degraded' | 'poor'>('good')
  // Caméra active : 'environment' (arrière) | 'user' (avant)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const channelRef      = useRef<any>(null)
  const mediaRef        = useRef<MediaStream | null>(null)
  const peersRef        = useRef<Map<string, RTCPeerConnection>>(new Map())
  const iceBufRef       = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Surveiller la qualité réseau de l'admin en continu ────────────────────
  const startNetworkMonitor = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)
    statsIntervalRef.current = setInterval(async () => {
      let totalLoss = 0
      let totalRtt = 0
      let peerCount = 0

      for (const pc of peersRef.current.values()) {
        if (pc.connectionState !== 'connected') continue
        peerCount++
        try {
          const stats = await pc.getStats()
          stats.forEach(report => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              // CORRECTIF : utiliser les deltas stockés par adaptBitrateFromStats
              // plutôt que les valeurs cumulatives brutes
              const curLost = report.packetsLost ?? 0
              const curSent = report.packetsSent ?? 0
              const prev    = _prevRtpStats.get(pc) ?? { lost: 0, sent: 0 }
              const deltaLost = Math.max(0, curLost - prev.lost)
              const deltaSent = Math.max(0, curSent - prev.sent)
              const total = deltaSent + deltaLost
              totalLoss += total > 0 ? deltaLost / total : 0
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              totalRtt += report.currentRoundTripTime ?? 0
            }
          })
          // Adapter le bitrate si la connexion se dégrade
          await adaptBitrateFromStats(pc)
        } catch { /* ignore */ }
      }

      if (peerCount === 0) return
      const avgLoss = totalLoss / peerCount
      const avgRtt  = totalRtt  / peerCount

      if (avgLoss > 0.15 || avgRtt > 0.8) {
        setNetworkQuality('poor')
      } else if (avgLoss > 0.05 || avgRtt > 0.4) {
        setNetworkQuality('degraded')
      } else {
        setNetworkQuality('good')
      }
    }, 5_000)
  }, [])

  // ── Créer / recréer la connexion peer pour un viewer ──────────────────────
  const createPeerForViewer = useCallback(async (channel: any, viewerId: string) => {
    // Fermer la connexion existante si retry
    if (peersRef.current.has(viewerId)) {
      peersRef.current.get(viewerId)!.close()
      peersRef.current.delete(viewerId)
    }
    iceBufRef.current.set(viewerId, [])

    const pc = await createPc()
    peersRef.current.set(viewerId, pc)

    mediaRef.current!.getTracks().forEach(t => {
      const sender = pc.addTrack(t, mediaRef.current!)
      if (t.kind === 'video') {
        try {
          const params = sender.getParameters()
          // Préférer réduire la résolution plutôt que le framerate en cas de congestion
          params.degradationPreference = 'maintain-framerate'
          sender.setParameters(params).catch(() => {})
        } catch {}
      }
    })

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        channel.send({
          type: 'broadcast', event: 'ice-candidate',
          payload: { target: viewerId, candidate: candidate.toJSON(), from: 'broadcaster' },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      console.log(`📡 [BC] peer ${viewerId} → ${s}`)

      if (s === 'disconnected') {
        // ICE restart après 2s
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            console.log(`📡 [BC] ICE restart for ${viewerId}`)
            createPeerForViewer(channel, viewerId)
          }
        }, 2_000)
      }
      if (s === 'failed') {
        peersRef.current.delete(viewerId)
        // Retry immédiat en cas d'échec total
        setTimeout(() => createPeerForViewer(channel, viewerId), 1_000)
      }
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      channel.send({
        type: 'broadcast', event: 'offer',
        payload: { target: viewerId, offer },
      })
      console.log(`📡 [BC] offer → ${viewerId}`)
    } catch (err) {
      console.error('📡 [BC] createOffer error', err)
    }
  }, [])

  // ── Démarrer le broadcast ──────────────────────────────────────────────────
  const startBroadcast = async () => {
    try {
      let mediaStream: MediaStream | null = null

      // Construire les contraintes vidéo selon le device sélectionné ou le facing mode
      // Sur iPhone, `exact` est nécessaire pour garantir la caméra arrière
      const buildVideoConstraints = (quality: MediaTrackConstraints): MediaTrackConstraints => {
        if (options?.videoDeviceId) {
          // Device explicitement choisi → on ignore facingMode
          return { ...quality, deviceId: { exact: options.videoDeviceId } }
        }
        // Forcer exact sur iOS pour éviter que Safari ignore le facing mode
        return { ...quality, facingMode: { exact: facingMode } }
      }

      // Tentatives en cascade : haute → moyenne → basse qualité → contraintes minimales
      // Sur iPhone, si 'exact' échoue (ex: caméra avant demandée mais indisponible),
      // on retombe sur 'ideal' pour ne pas bloquer complètement.
      const attempts: { video: MediaTrackConstraints | boolean; label: string }[] = [
        { video: buildVideoConstraints(VIDEO_CONSTRAINTS_HIGH), label: 'haute' },
        { video: buildVideoConstraints(VIDEO_CONSTRAINTS_MED),  label: 'moyenne' },
        { video: buildVideoConstraints(VIDEO_CONSTRAINTS_LOW),  label: 'basse' },
        // Fallback sans exact — laisse le navigateur choisir
        { video: { ...VIDEO_CONSTRAINTS_LOW, facingMode: { ideal: facingMode } }, label: 'basse (fallback)' },
        { video: true, label: 'minimale' },
      ]

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(options?.audioDeviceId ? { deviceId: { exact: options.audioDeviceId } } : {}),
      }

      for (const attempt of attempts) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: attempt.video,
            audio: audioConstraints,
          })
          console.log(`📡 [BC] caméra démarrée en qualité ${attempt.label}`)
          break
        } catch (e) {
          console.warn(`📡 [BC] qualité ${attempt.label} refusée, tentative suivante...`, e)
        }
      }

      if (!mediaStream) {
        throw new Error("Impossible d'accéder à la caméra après toutes les tentatives.")
      }

      mediaRef.current = mediaStream
      setStream(mediaStream)
      setIsBroadcasting(true)

      // Hint navigateur : flux de mouvement (sport) → optimise l'encodeur
      mediaStream.getVideoTracks().forEach(track => {
        if ('contentHint' in track) (track as any).contentHint = 'motion'
      })
      mediaStream.getAudioTracks().forEach(track => {
        if ('contentHint' in track) (track as any).contentHint = 'speech'
      })

      const name = `stream-${matchId}`
      const stale = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
      if (stale) await supabase.removeChannel(stale)

      const channel = supabase.channel(name)
      channelRef.current = channel

      const updateViewerCount = () => {
        if (!channelRef.current) return
        const state = channelRef.current.presenceState()
        const count = (Object.values(state) as any[]).flat().reduce((acc: number, p: any) => {
          return acc + (p.is_viewer ? 1 : 0)
        }, 0)
        setViewerCount(count)
      }

      channel
        .on('presence', { event: 'sync' }, updateViewerCount)
      .on('broadcast', { event: 'viewer-join' }, ({ payload }) => {
          console.log('📡 [BC] viewer-join from', payload.viewerId)

          // CORRECTIF : refuser si le nombre max de viewers est atteint
          if (peersRef.current.size >= MAX_VIEWERS) {
            console.warn(`📡 [BC] max viewers (${MAX_VIEWERS}) reached — rejecting ${payload.viewerId}`)
            channel.send({
              type: 'broadcast', event: 'stream-full',
              payload: { target: payload.viewerId, maxViewers: MAX_VIEWERS },
            })
            return
          }

          const existingPc = peersRef.current.get(payload.viewerId)

          // Si la PC est déjà connectée → renvoyer l'offer pour que le viewer
          // puisse se reconnecter après une coupure réseau côté viewer
          if (existingPc && existingPc.connectionState === 'connected') {
            console.log(`📡 [BC] viewer ${payload.viewerId} already connected — re-sending offer`)
            createPeerForViewer(channel, payload.viewerId)
            return
          }

          // Si la PC est en cours de connexion → ignorer pour éviter les doublons
          if (existingPc && existingPc.connectionState === 'connecting') {
            console.log(`📡 [BC] viewer ${payload.viewerId} already connecting — ignoring`)
            return
          }

          createPeerForViewer(channel, payload.viewerId)
          setTimeout(updateViewerCount, 500)
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          const pc = peersRef.current.get(payload.viewerId)
          if (!pc || pc.signalingState !== 'have-local-offer') return
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
            console.log('📡 [BC] answer set for', payload.viewerId)
            // Appliquer les paramètres d'encodage adaptés à la qualité réseau actuelle
            await applyEncodingParams(pc)
            // Vider le buffer ICE
            const buf = iceBufRef.current.get(payload.viewerId) ?? []
            for (const c of buf) {
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
            }
            iceBufRef.current.set(payload.viewerId, [])
          } catch (err) {
            console.error('📡 [BC] setRemoteDescription error', err)
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.target !== 'broadcaster') return
          const pc = peersRef.current.get(payload.from)
          if (!pc) return
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {})
          } else {
            const buf = iceBufRef.current.get(payload.from) ?? []
            buf.push(payload.candidate)
            iceBufRef.current.set(payload.from, buf)
          }
        })
        .subscribe(async (status) => {
          console.log('📡 [BC] channel status:', status)
          if (status === 'SUBSCRIBED') {
            await channel.track({ is_broadcaster: true, user_id: user?.id ?? 'anon' })
            console.log('📡 [BC] presence tracked')
            // Tracker aussi sur le channel de présence séparé (pour useWebRTCPresence)
            // Réutiliser s'il existe déjà pour éviter les doublons
            const existingPc = supabase.getChannels().find(c => c.topic === `realtime:presence-${matchId}`)
            const presenceChannel = existingPc ?? supabase.channel(`presence-${matchId}`)
            if (!existingPc) {
              presenceChannel.subscribe(async (s) => {
                if (s === 'SUBSCRIBED') {
                  await presenceChannel.track({ is_broadcaster: true, user_id: user?.id ?? 'anon' })
                }
              })
            } else {
              presenceChannel.track({ is_broadcaster: true, user_id: user?.id ?? 'anon' }).catch(() => {})
            }
            // Démarrer le monitoring réseau
            startNetworkMonitor()
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('📡 [BC] channel error — reconnecting in 3s...')
            // CORRECTIF : tenter une reconnexion automatique au lieu d'ignorer
            setTimeout(async () => {
              if (!channelRef.current || !mediaRef.current) return
              try {
                await supabase.removeChannel(channelRef.current)
              } catch { /* ignore */ }
              channelRef.current = null
              // Relancer le broadcast sur un nouveau channel
              // On ne relance pas getUserMedia (stream déjà actif), on recrée juste le channel
              const newChannel = supabase.channel(`stream-${matchId}`)
              channelRef.current = newChannel
              // Re-subscribe et re-track la présence
              newChannel.subscribe(async (s) => {
                if (s === 'SUBSCRIBED') {
                  await newChannel.track({ is_broadcaster: true, user_id: user?.id ?? 'anon' })
                  console.log('📡 [BC] reconnected after channel error')
                  startNetworkMonitor()
                }
              })
            }, 3_000)
          }
        })
    } catch (err) {
      console.error('📡 [BC] startBroadcast error', err)

      // CORRECTIF : remplacer alert() par le callback onError avec un message
      // contextuel selon le type d'erreur (permission, caméra occupée, etc.)
      const notify = options?.onError ?? ((msg: string) => alert(msg))

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          notify(
            'Permission caméra refusée',
            'Autorisez l\'accès à la caméra dans les paramètres de votre navigateur, puis réessayez.'
          )
        } else if (err.name === 'NotFoundError') {
          notify(
            'Aucune caméra détectée',
            'Vérifiez qu\'une caméra est bien connectée et non utilisée par une autre application.'
          )
        } else if (err.name === 'NotReadableError') {
          notify(
            'Caméra déjà utilisée',
            'Une autre application utilise la caméra. Fermez-la et réessayez.'
          )
        } else {
          notify('Erreur caméra', err.message)
        }
      } else {
        notify(
          'Impossible de démarrer le live',
          err instanceof Error ? err.message : 'Erreur inconnue'
        )
      }
    }
  }

  // ── Basculer entre caméra avant et arrière pendant le broadcast ──────────
  // Remplace la track vidéo dans tous les peers sans couper le stream audio.
  // Sur iPhone, on doit arrêter l'ancienne track avant d'en demander une nouvelle.
  const switchCamera = useCallback(async () => {
    if (!mediaRef.current || !isBroadcasting) return

    const newFacing: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment'

    try {
      // Demander le nouveau stream vidéo uniquement
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacing }, width: { ideal: 854 }, height: { ideal: 480 } },
        audio: false,
      })

      const newVideoTrack = newStream.getVideoTracks()[0]
      if (!newVideoTrack) return

      // Remplacer la track dans tous les peers WebRTC actifs
      for (const pc of peersRef.current.values()) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(newVideoTrack).catch(err =>
            console.warn('📡 [BC] replaceTrack error', err)
          )
        }
      }

      // Arrêter l'ancienne track vidéo et mettre à jour le stream local
      mediaRef.current.getVideoTracks().forEach(t => t.stop())
      mediaRef.current.removeTrack(mediaRef.current.getVideoTracks()[0])
      mediaRef.current.addTrack(newVideoTrack)

      // Mettre à jour le stream exposé (déclenche le re-render de la preview)
      const updatedStream = new MediaStream([
        newVideoTrack,
        ...mediaRef.current.getAudioTracks(),
      ])
      mediaRef.current = updatedStream
      setStream(updatedStream)
      setFacingMode(newFacing)

      if ('contentHint' in newVideoTrack) (newVideoTrack as any).contentHint = 'motion'
      console.log(`📡 [BC] camera switched to ${newFacing}`)
    } catch (err) {
      console.error('📡 [BC] switchCamera error', err)
      const notify = options?.onError ?? ((msg: string) => alert(msg))
      notify('Impossible de changer de caméra', err instanceof Error ? err.message : undefined)
    }
  }, [facingMode, isBroadcasting, options])

  // ── Arrêter le broadcast ──────────────────────────────────────────────────
  const stopBroadcast = () => {    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
    mediaRef.current?.getTracks().forEach(t => t.stop())
    mediaRef.current = null
    setStream(null)
    setIsBroadcasting(false)
    setNetworkQuality('good')
    peersRef.current.forEach(pc => {
      pc.onicecandidate = null
      pc.onconnectionstatechange = null
      pc.ontrack = null
      pc.close()
    })
    peersRef.current.clear()
    iceBufRef.current.clear()
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    // Nettoyer aussi le channel de présence séparé
    const presenceCh = supabase.getChannels().find(c => c.topic === `realtime:presence-${matchId}`)
    if (presenceCh) supabase.removeChannel(presenceCh)
  }

  useEffect(() => () => { stopBroadcast() }, []) // eslint-disable-line

  return { stream, isBroadcasting, startBroadcast, stopBroadcast, viewerCount, networkQuality, switchCamera, facingMode }
}

// ── useWebRTCViewer ───────────────────────────────────────────────────────────
export function useWebRTCViewer(matchId: string) {
  const { user } = useAuth()
  const [stream, setStream]           = useState<MediaStream | null>(null)
  const [isLive, setIsLive]           = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'idle'>('idle')
  // AJOUT : état pour informer l'UI que le stream est complet (trop de viewers)
  const [isStreamFull, setIsStreamFull] = useState(false)

  // ── DVR : buffer des chunks enregistrés pour le retour en arrière ──────────
  // On enregistre le stream reçu via MediaRecorder et on stocke les chunks
  // dans un tableau circulaire limité à DVR_BUFFER_SECONDS secondes.
  const [dvrEnabled,   setDvrEnabled]   = useState(false)
  const [dvrOffset,    setDvrOffset]    = useState(0)     // secondes de retard par rapport au live
  const [dvrDuration,  setDvrDuration]  = useState(0)     // durée totale disponible dans le buffer
  const [dvrBlobUrl,   setDvrBlobUrl]   = useState<string | null>(null) // blob URL réactive du DVR
  const [dvrPlaybackStartTs, setDvrPlaybackStartTs] = useState<number | null>(null)

  const channelRef      = useRef<any>(null)
  const pcRef           = useRef<RTCPeerConnection | null>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const iceBufRef       = useRef<RTCIceCandidateInit[]>([])
  const retryRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef   = useRef(0)

  // CORRECTIF : persister le viewerId en sessionStorage pour survivre aux
  // démontages/remontages du composant (navigation SPA).
  // Si l'utilisateur est connecté, on utilise son user.id (stable).
  // Sinon on génère un ID aléatoire et on le conserve pour toute la session.
  const viewerId = useRef<string>(
    (() => {
      if (user?.id) return user.id
      const key = `viewer-id-${matchId}`
      const stored = sessionStorage.getItem(key)
      if (stored) return stored
      const generated = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem(key, generated)
      return generated
    })()
  ).current

  // DVR refs
  const recorderRef       = useRef<MediaRecorder | null>(null)
  const dvrChunksRef      = useRef<{ blob: Blob; ts: number; isInit: boolean }[]>([])
  const dvrActiveRef      = useRef(false)
  const initChunkRef      = useRef<Blob | null>(null) // premier chunk = header WebM (obligatoire)

  // MediaSource refs
  const mediaSourceRef    = useRef<MediaSource | null>(null)
  const sourceBufferRef   = useRef<SourceBuffer | null>(null)
  const appendQueueRef    = useRef<Blob[]>([])
  const isAppendingRef    = useRef(false)

  // ── Gérer la file d'attente d'ajouts MediaSource ──────────────────────────
  const processAppendQueue = useCallback(() => {
    const sb = sourceBufferRef.current
    if (!sb || sb.updating || isAppendingRef.current) return
    if (appendQueueRef.current.length === 0) return

    // CORRECTIF : vérifier que le SourceBuffer est encore attaché à un
    // MediaSource ouvert avant d'appeler appendBuffer.
    // Le FileReader.onload peut arriver après un closeMediaSource().
    const ms = mediaSourceRef.current
    if (!ms || ms.readyState !== 'open') {
      // MediaSource fermé — vider la file et abandonner
      appendQueueRef.current = []
      isAppendingRef.current = false
      return
    }

    const blob = appendQueueRef.current.shift()!
    const reader = new FileReader()
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) return

      // Double-vérification au moment de l'écriture (le MediaSource peut avoir
      // été fermé pendant la lecture asynchrone du FileReader)
      const currentSb = sourceBufferRef.current
      const currentMs = mediaSourceRef.current
      if (!currentSb || !currentMs || currentMs.readyState !== 'open') {
        isAppendingRef.current = false
        appendQueueRef.current = []
        return
      }

      try {
        isAppendingRef.current = true
        currentSb.appendBuffer(reader.result)
      } catch (err) {
        // InvalidStateError attendu si le SourceBuffer a été retiré entre-temps
        if (err instanceof DOMException && err.name === 'InvalidStateError') {
          console.debug('📡 [DVR] appendBuffer skipped — SourceBuffer detached')
        } else {
          console.error('📡 [DVR] appendBuffer error', err)
        }
        isAppendingRef.current = false
        appendQueueRef.current = []
      }
    }
    reader.readAsArrayBuffer(blob)
  }, [])

  // ── Fermer le MediaSource propre ───────────────────────────────────────────
  const closeMediaSource = useCallback(() => {
    // CORRECTIF : vider la file et bloquer les appends EN PREMIER,
    // avant de détacher le SourceBuffer — évite le InvalidStateError
    // dans les FileReader.onload déjà en cours.
    appendQueueRef.current = []
    isAppendingRef.current = false

    if (sourceBufferRef.current) {
      try {
        const ms = mediaSourceRef.current
        if (ms && ms.readyState === 'open') {
          ms.removeSourceBuffer(sourceBufferRef.current)
        }
      } catch (e) {}
      sourceBufferRef.current = null
    }
    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === 'open') {
          mediaSourceRef.current.endOfStream()
        }
      } catch { /* ignore */ }
      mediaSourceRef.current = null
    }
    // CORRECTIF : révoquer l'ancienne URL pour éviter la fuite mémoire
    setDvrBlobUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  // ── Démarrer l'enregistrement DVR du stream reçu ──────────────────────────
  const startDvrRecording = useCallback((liveStream: MediaStream) => {
    // CORRECTIF : si un recorder existe déjà (reconnexion WebRTC), l'arrêter proprement
    // avant d'en créer un nouveau pour garantir un header WebM frais et cohérent.
    if (recorderRef.current) {
      if (recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop() } catch { /* ignore */ }
      }
      recorderRef.current = null
      // Invalider l'ancien header — il ne correspond plus au nouveau stream
      initChunkRef.current = null
      // Vider les chunks data liés à l'ancien header (garder uniquement les données valides)
      dvrChunksRef.current = []
    }

    // Choisir le codec supporté
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(m => MediaRecorder.isTypeSupported(m)) ?? ''

    if (!mimeType) {
      console.warn('📡 [DVR] MediaRecorder non supporté sur ce navigateur')
      return
    }

    const recorder = new MediaRecorder(liveStream, {
      mimeType,
      videoBitsPerSecond: 500_000,
    })
    recorderRef.current = recorder
    let isFirstChunk = true

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return
      const now = Date.now()

      if (isFirstChunk) {
        // Le premier chunk contient le header WebM (EBML + Segment + Tracks)
        // CORRECTIF : stocker ET inclure dans dvrChunksRef pour cohérence
        initChunkRef.current = e.data
        isFirstChunk = false
        dvrChunksRef.current = [{ blob: e.data, ts: now, isInit: true }]
        return
      }

      dvrChunksRef.current.push({ blob: e.data, ts: now, isInit: false })

      // Pousser le chunk dans le MediaSource si DVR actif et fonctionnel
      if (dvrActiveRef.current && sourceBufferRef.current) {
        appendQueueRef.current.push(e.data)
        processAppendQueue()
      }

      // Purger les chunks plus vieux que DVR_BUFFER_SECONDS (mais jamais le chunk init)
      const cutoff = now - DVR_BUFFER_SECONDS * 1000
      dvrChunksRef.current = dvrChunksRef.current.filter(c => c.isInit || c.ts >= cutoff)

      // Mettre à jour la durée disponible
      const dataChunks = dvrChunksRef.current.filter(c => !c.isInit)
      if (dataChunks.length > 0) {
        const oldest = dataChunks[0].ts
        setDvrDuration(Math.round((now - oldest) / 1000))
      }
    }

    recorder.start(1_000) // chunk toutes les secondes
    console.log('📡 [DVR] enregistrement démarré')
  }, [processAppendQueue])

  // ── Arrêter l'enregistrement DVR ──────────────────────────────────────────
  const stopDvrRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {}
    }
    recorderRef.current = null
    dvrChunksRef.current = []
    initChunkRef.current = null
    dvrActiveRef.current = false
    setDvrEnabled(false)
    setDvrOffset(0)
    setDvrDuration(0)
    closeMediaSource()
    setDvrPlaybackStartTs(null)
  }, [closeMediaSource])

  // Helper pour replier sur URL Blob statique (fallback MSE non supporté)
  // CORRECTIF : révoquer l'ancienne URL avant d'en créer une nouvelle
  const fallbackToStaticBlob = useCallback((initChunk: Blob, dataBlobs: Blob[], mimeType: string) => {
    const blob = new Blob([initChunk, ...dataBlobs], { type: mimeType })
    const url = URL.createObjectURL(blob)
    setDvrBlobUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }, [])

  // ── Activer le mode DVR : lire depuis le buffer à un offset donné ─────────
  // offsetSeconds = 0 → live, > 0 → retour en arrière
  const seekDvr = useCallback((offsetSeconds: number) => {
    if (offsetSeconds <= 0) {
      // Retour au live
      dvrActiveRef.current = false
      setDvrEnabled(false)
      setDvrOffset(0)
      closeMediaSource()
      setDvrPlaybackStartTs(null)
      return
    }

    const initChunk = initChunkRef.current
    if (!initChunk) return // pas encore de header — impossible de décoder

    const dataChunks = dvrChunksRef.current.filter(c => !c.isInit)
    if (dataChunks.length === 0) return

    const now = Date.now()
    const targetTs = now - offsetSeconds * 1000

    // Trouver le chunk de données le plus proche du timestamp cible
    let startIdx = dataChunks.findIndex(c => c.ts >= targetTs)
    if (startIdx === -1) startIdx = 0 // fallback : début du buffer

    const selectedDataChunks = dataChunks.slice(startIdx)
    setDvrPlaybackStartTs(selectedDataChunks[0].ts)

    // Détecter le MIME type depuis le recorder (le plus fiable)
    const mimeType = recorderRef.current?.mimeType ?? 'video/webm'

    if (typeof window !== 'undefined' && 'MediaSource' in window && MediaSource.isTypeSupported(mimeType)) {
      closeMediaSource() // Fermer le précédent

      const ms = new MediaSource()
      mediaSourceRef.current = ms
      const url = URL.createObjectURL(ms)

      ms.addEventListener('sourceopen', () => {
        try {
          const sb = ms.addSourceBuffer(mimeType)
          sourceBufferRef.current = sb
          sb.mode = 'segments'

          sb.addEventListener('updateend', () => {
            isAppendingRef.current = false
            processAppendQueue()
          })

          // Enfiler le chunk d'initialisation et les chunks historiques
          appendQueueRef.current = [initChunk, ...selectedDataChunks.map(c => c.blob)]
          processAppendQueue()

        } catch (err) {
          console.error('📡 [DVR] Error initializing SourceBuffer', err)
          fallbackToStaticBlob(initChunk, selectedDataChunks.map(c => c.blob), mimeType)
        }
      })

      dvrActiveRef.current = true
      setDvrEnabled(true)
      setDvrOffset(offsetSeconds)
      // CORRECTIF : révoquer l'ancienne URL MediaSource avant d'exposer la nouvelle
      setDvrBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } else {
      // Fallback blob statique si MSE non supporté
      fallbackToStaticBlob(initChunk, selectedDataChunks.map(c => c.blob), mimeType)
      dvrActiveRef.current = true
      setDvrEnabled(true)
      setDvrOffset(offsetSeconds)
    }
  }, [processAppendQueue, closeMediaSource, fallbackToStaticBlob])

  const clearRetry = () => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }
  }

  const sendJoin = (channel: any, delay = 0) => {
    clearRetry()
    retryRef.current = setTimeout(() => {
      if (!channelRef.current) return
      if (retryCountRef.current >= 10) {
        console.log('📡 [V] max join retries reached — stopping')
        return
      }
      // Ne pas renvoyer si une PC est déjà en cours de connexion
      if (pcRef.current && (pcRef.current.connectionState === 'connecting' || pcRef.current.connectionState === 'connected')) {
        console.log('📡 [V] PC already connecting/connected — skipping join')
        return
      }
      console.log(`📡 [V] viewer-join (attempt ${retryCountRef.current + 1}) →`, viewerId)
      channel.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId } })
      retryCountRef.current++

      // Backoff exponentiel : 3s, 4.5s, 6.75s... max 20s
      // Délai initial plus long pour laisser le temps à l'offer d'arriver
      const nextDelay = Math.min(3_000 * Math.pow(1.5, retryCountRef.current), 20_000)

      retryRef.current = setTimeout(() => {
        if (!streamRef.current && channelRef.current) {
          console.log(`📡 [V] no stream after 3s — retrying in ${Math.round(nextDelay)}ms`)
          sendJoin(channel, nextDelay)
        }
      }, 3_000)
    }, delay)
  }

  const closePc = () => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null
      pcRef.current.onconnectionstatechange = null
      pcRef.current.ontrack = null
      pcRef.current.close()
      pcRef.current = null
    }
    iceBufRef.current = []
  }

  useEffect(() => {
    if (!matchId) return
    retryCountRef.current = 0

    const channel = supabase.channel(`stream-${matchId}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const hasBc = Object.values(state).some((list: any) =>
          list.some((p: any) => p.is_broadcaster)
        )
        setIsLive(hasBc)

        const count = (Object.values(state) as any[]).flat().reduce((acc: number, p: any) => {
          return acc + (p.is_viewer ? 1 : 0)
        }, 0)
        setViewerCount(count)

        if (hasBc && !streamRef.current) {
          // Ne pas envoyer viewer-join si une PC est déjà en cours de connexion
          // (évite les doublons quand le channel se reconnecte brièvement)
          const pcState = pcRef.current?.connectionState
          if (pcState === 'connecting' || pcState === 'connected') {
            console.log('📡 [V] presence sync — PC already', pcState, '— skipping join')
            return
          }
          sendJoin(channel)
        } else if (!hasBc) {
          clearRetry()
          closePc()
          stopDvrRecording()
          streamRef.current = null
          setStream(null)
          retryCountRef.current = 0
        }
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.target !== viewerId) return
        clearRetry()
        console.log('📡 [V] offer received')
        closePc()
        iceBufRef.current = []

        const pc = await createPc()
        pcRef.current = pc

        pc.ontrack = (e) => {
          const incomingStream = e.streams[0]
          incomingStream.getVideoTracks().forEach(t => {
            if ('contentHint' in t) (t as any).contentHint = 'motion'
          })
          console.log('📡 [V] 🎉 stream received!')
          streamRef.current = incomingStream
          setStream(incomingStream)
          clearRetry()
          retryCountRef.current = 0
          // Démarrer l'enregistrement DVR dès réception du stream
          startDvrRecording(incomingStream)
        }

        pc.onicecandidate = ({ candidate }) => {
          if (candidate) {
            channel.send({
              type: 'broadcast', event: 'ice-candidate',
              payload: { target: 'broadcaster', candidate: candidate.toJSON(), from: viewerId },
            })
          }
        }

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState
          console.log('📡 [V] PC state →', s)
          setConnectionState(s)

          if (s === 'disconnected') {
            setTimeout(() => {
              if (pc.connectionState !== 'connected' && channelRef.current) {
                console.log('📡 [V] disconnected — retrying join')
                closePc()
                streamRef.current = null
                setStream(null)
                sendJoin(channelRef.current)
              }
            }, 2_000)
          }
          if (s === 'failed') {
            console.warn('📡 [V] PC failed — ICE candidates did not connect (TURN issue?)')
            closePc()
            streamRef.current = null
            setStream(null)
            // Backoff plus long sur failed pour ne pas spammer le broadcaster
            if (channelRef.current) sendJoin(channelRef.current, 3_000)
          }
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          for (const c of iceBufRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
          }
          iceBufRef.current = []

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'answer', payload: { viewerId, answer } })
          console.log('📡 [V] answer sent')
        } catch (err) {
          console.error('📡 [V] handshake error', err)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.target !== viewerId) return
        const pc = pcRef.current
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {})
        } else {
          iceBufRef.current.push(payload.candidate)
        }
      })
      // CORRECTIF : gérer le refus de connexion quand le stream est plein
      .on('broadcast', { event: 'stream-full' }, ({ payload }) => {
        if (payload.target !== viewerId) return
        console.warn(`📡 [V] stream full (max ${payload.maxViewers} viewers) — stopping retries`)
        clearRetry()
        setIsStreamFull(true)
      })
      .subscribe(async (status) => {
        console.log('📡 [V] channel status:', status)
        if (status === 'SUBSCRIBED') {
          // CORRECTIF : remettre le compteur à 0 à chaque reconnexion du channel
          // pour que le viewer puisse retenter après une coupure réseau
          retryCountRef.current = 0
          await channel.track({ is_viewer: true, user_id: user?.id ?? 'anon' })
          console.log('📡 [V] presence tracked')
          // Tracker aussi sur le channel de présence séparé
          const existingPc = supabase.getChannels().find(c => c.topic === `realtime:presence-${matchId}`)
          const presenceChannel = existingPc ?? supabase.channel(`presence-${matchId}`)
          if (!existingPc) {
            presenceChannel.subscribe(async (s) => {
              if (s === 'SUBSCRIBED') {
                await presenceChannel.track({ is_viewer: true, user_id: user?.id ?? 'anon' })
              }
            })
          } else {
            presenceChannel.track({ is_viewer: true, user_id: user?.id ?? 'anon' }).catch(() => {})
          }
        }
      })

    // CORRECTIF : reprendre la connexion si l'onglet redevient visible
    // (les navigateurs mobiles suspendent getUserMedia en arrière-plan)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        if (!streamRef.current && !pcRef.current) {
          console.log('📡 [V] tab visible again — retrying join')
          retryCountRef.current = 0
          sendJoin(channelRef.current)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearRetry()
      closePc()
      stopDvrRecording()
      supabase.removeChannel(channel)
      channelRef.current = null
      // Nettoyer le channel de présence séparé
      const presenceCh = supabase.getChannels().find(c => c.topic === `realtime:presence-${matchId}`)
      if (presenceCh) supabase.removeChannel(presenceCh)
      // CORRECTIF : retirer le listener visibilitychange
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [matchId, viewerId]) // eslint-disable-line

  return {
    stream,
    isLive,
    viewerCount,
    isStreamFull,  // AJOUT : true si le stream est plein (trop de viewers)
    connectionState, // 'idle' | RTCPeerConnectionState — pour l'UI
    // DVR
    dvrEnabled,
    dvrOffset,
    dvrDuration,
    dvrBlobUrl,          // reactive blob URL (null when DVR off)
    seekDvr,
    dvrPlaybackStartTs,
  }
}

// ── useWebRTCPresence ─────────────────────────────────────────────────────────
// Hook léger qui écoute le channel "presence-{matchId}" (distinct du channel
// "stream-{matchId}" utilisé par le viewer/broadcaster) pour savoir si un live
// est actif et combien de spectateurs sont connectés.
// Le broadcaster publie aussi sa présence sur ce channel séparé.
// Le config presence key est vide par défaut pour compter correctement chaque spectateur.
export function useWebRTCPresence(matchId: string) {
  const [isLive, setIsLive]           = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!matchId) return

    const channel = supabase.channel(`presence-${matchId}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const hasBc = Object.values(state).some((list: any) =>
          list.some((p: any) => p.is_broadcaster)
        )
        setIsLive(hasBc)
        const count = (Object.values(state) as any[]).flat().reduce((acc: number, p: any) =>
          acc + (p.is_viewer ? 1 : 0), 0)
        setViewerCount(count)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [matchId])

  return { isLive, viewerCount }
}
