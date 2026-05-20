import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── ICE servers : STUN public + TURN fallback ────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 5,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

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

// ── Durée max du buffer DVR côté viewer (en secondes) ───────────────────────
const DVR_BUFFER_SECONDS = 300 // 5 minutes de retour en arrière possible



// ── Détecter la qualité réseau estimée ──────────────────────────────────────
// Retourne 'high' | 'medium' | 'low' selon navigator.connection si disponible
function getNetworkQuality(): 'high' | 'medium' | 'low' {
  const conn = (navigator as any).connection
  if (!conn) return 'medium'
  const { effectiveType, downlink } = conn
  if (effectiveType === '4g' && downlink >= 2) return 'high'
  if (effectiveType === '4g' || (effectiveType === '3g' && downlink >= 1)) return 'medium'
  return 'low'
}

// ── Choisir les contraintes vidéo selon la qualité réseau ───────────────────
function getVideoConstraints(): MediaTrackConstraints {
  const q = getNetworkQuality()
  if (q === 'high') return VIDEO_CONSTRAINTS_HIGH
  if (q === 'medium') return VIDEO_CONSTRAINTS_MED
  return VIDEO_CONSTRAINTS_LOW
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

// ── Adapter dynamiquement le bitrate selon les stats RTC ────────────────────
// Appelé toutes les 5s pour ajuster si la connexion se dégrade en cours de live
async function adaptBitrateFromStats(pc: RTCPeerConnection) {
  try {
    const stats = await pc.getStats()
    let packetLossRate = 0
    let rtt = 0

    stats.forEach(report => {
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        const lost = report.packetsLost ?? 0
        const sent = report.packetsSent ?? 1
        packetLossRate = lost / (sent + lost)
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
function createPc(): RTCPeerConnection {
  return new RTCPeerConnection(ICE_CONFIG)
}

// ── useWebRTCBroadcaster ──────────────────────────────────────────────────────
export function useWebRTCBroadcaster(matchId: string) {
  const { user } = useAuth()
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  // Qualité réseau estimée : 'good' | 'degraded' | 'poor'
  const [networkQuality, setNetworkQuality] = useState<'good' | 'degraded' | 'poor'>('good')

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
              const lost = report.packetsLost ?? 0
              const sent = report.packetsSent ?? 1
              totalLoss += lost / (sent + lost)
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

    const pc = createPc()
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

      // Tentatives en cascade : haute → moyenne → basse qualité → audio seul
      const attempts = [
        { video: VIDEO_CONSTRAINTS_HIGH, label: 'haute' },
        { video: VIDEO_CONSTRAINTS_MED,  label: 'moyenne' },
        { video: VIDEO_CONSTRAINTS_LOW,  label: 'basse' },
        { video: true,                   label: 'minimale' },
      ]

      for (const attempt of attempts) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: attempt.video,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
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
          // Ignorer si une connexion est déjà établie ou en cours pour ce viewer
          const existingPc = peersRef.current.get(payload.viewerId)
          if (existingPc && (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting')) {
            console.log(`📡 [BC] viewer ${payload.viewerId} already connecting/connected — ignoring duplicate join`)
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
            console.warn('📡 [BC] channel error — will retry on next SUBSCRIBED')
          }
        })
    } catch (err) {
      console.error('📡 [BC] startBroadcast error', err)
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions de votre navigateur.")
    }
  }

  // ── Arrêter le broadcast ──────────────────────────────────────────────────
  const stopBroadcast = () => {
    if (statsIntervalRef.current) {
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

  return { stream, isBroadcasting, startBroadcast, stopBroadcast, viewerCount, networkQuality }
}

// ── useWebRTCViewer ───────────────────────────────────────────────────────────
export function useWebRTCViewer(matchId: string) {
  const { user } = useAuth()
  const [stream, setStream]           = useState<MediaStream | null>(null)
  const [isLive, setIsLive]           = useState(false)
  const [viewerCount, setViewerCount] = useState(0)

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
  const viewerId        = useRef(user?.id ?? Math.random().toString(36).slice(2)).current

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

    const blob = appendQueueRef.current.shift()!
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        try {
          isAppendingRef.current = true
          sb.appendBuffer(reader.result)
        } catch (err) {
          console.error('📡 [DVR] appendBuffer error', err)
          isAppendingRef.current = false
        }
      }
    }
    reader.readAsArrayBuffer(blob)
  }, [])

  // ── Fermer le MediaSource propre ───────────────────────────────────────────
  const closeMediaSource = useCallback(() => {
    if (sourceBufferRef.current) {
      try {
        const ms = mediaSourceRef.current
        if (ms && ms.readyState === 'open') {
          ms.removeSourceBuffer(sourceBufferRef.current)
        }
      } catch (e) {}
      sourceBufferRef.current = null
    }
    mediaSourceRef.current = null
    appendQueueRef.current = []
    isAppendingRef.current = false
    setDvrBlobUrl(null)
  }, [])

  // ── Démarrer l'enregistrement DVR du stream reçu ──────────────────────────
  const startDvrRecording = useCallback((liveStream: MediaStream) => {
    if (recorderRef.current) return // déjà en cours

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
        initChunkRef.current = e.data
        isFirstChunk = false
        dvrChunksRef.current.push({ blob: e.data, ts: now, isInit: true })
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
  // Crée un blob unique et expose son URL directement dans dvrBlobUrl
  const fallbackToStaticBlob = useCallback((initChunk: Blob, dataBlobs: Blob[], mimeType: string) => {
    const blob = new Blob([initChunk, ...dataBlobs], { type: mimeType })
    const url = URL.createObjectURL(blob)
    setDvrBlobUrl(url)
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
      setDvrBlobUrl(url) // réactive : LiveVideoPlayer reçoit la nouvelle URL et l'applique au lecteur
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

        if (hasBc && !streamRef.current && !pcRef.current) {
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

        const pc = createPc()
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
            closePc()
            streamRef.current = null
            setStream(null)
            if (channelRef.current) sendJoin(channelRef.current, 1_000)
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
      .subscribe(async (status) => {
        console.log('📡 [V] channel status:', status)
        if (status === 'SUBSCRIBED') {
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

    return () => {
      clearRetry()
      closePc()
      stopDvrRecording()
      supabase.removeChannel(channel)
      channelRef.current = null
      // Nettoyer le channel de présence séparé
      const presenceCh = supabase.getChannels().find(c => c.topic === `realtime:presence-${matchId}`)
      if (presenceCh) supabase.removeChannel(presenceCh)
    }
  }, [matchId, viewerId]) // eslint-disable-line

  return {
    stream,
    isLive,
    viewerCount,
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
