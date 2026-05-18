import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── ICE servers : STUN public + STUN fallback ────────────────────────────────
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
}

// ── Contraintes vidéo basse latence (480p @ 15fps) ──────────────────────────
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width:  { ideal: 854, max: 1280 },
  height: { ideal: 480, max: 720  },
  frameRate: { ideal: 15, max: 24  }, // 15fps → latence ~66ms au lieu de ~33ms
}

// ── Limiter le débit vidéo (réduit la latence de buffering) ──────────────────
async function setBitrate(pc: RTCPeerConnection, maxKbps = 800) {
  const sender = pc.getSenders().find(s => s.track?.kind === 'video')
  if (!sender) return
  try {
    const params = sender.getParameters()
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}]
    }
    params.encodings[0].maxBitrate   = maxKbps * 1000
    params.encodings[0].maxFramerate = 15
    // Préférer le codec H264 (accélération matérielle, faible latence)
    if (!params.encodings[0].priority) {
      params.encodings[0].priority = 'medium'
    }
    await sender.setParameters(params)
    console.log(`📡 [BC] bitrate cap set to ${maxKbps} kbps`)
  } catch (err) {
    console.warn('📡 [BC] setBitrate error (ignored):', err)
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

  const channelRef    = useRef<any>(null)
  const mediaRef      = useRef<MediaStream | null>(null)
  const peersRef      = useRef<Map<string, RTCPeerConnection>>(new Map())
  // Buffer ICE candidates per viewer that arrive before answer
  const iceBufRef     = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())

  // ── Créer / recréer la connexion peer pour un viewer ──────────────────────
  const createPeerForViewer = async (channel: any, viewerId: string) => {
    // Fermer la connexion existante si retry
    if (peersRef.current.has(viewerId)) {
      peersRef.current.get(viewerId)!.close()
      peersRef.current.delete(viewerId)
    }
    iceBufRef.current.set(viewerId, [])

    const pc = createPc()
    peersRef.current.set(viewerId, pc)

    mediaRef.current!.getTracks().forEach(t => pc.addTrack(t, mediaRef.current!))

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
      console.log(`📡 [BC] peer ${viewerId} state → ${s}`)
      if (s === 'disconnected') {
        // Tenter un ICE restart léger avant de tout refaire
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            console.log(`📡 [BC] ICE restart for ${viewerId}`)
            createPeerForViewer(channel, viewerId)
          }
        }, 3000)
      }
      if (s === 'failed') {
        peersRef.current.delete(viewerId)
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
  }

  // ── Démarrer le broadcast ──────────────────────────────────────────────────
  const startBroadcast = async () => {
    try {
      let mediaStream: MediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS, audio: true,
        })
      } catch {
        // Fallback: lower constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 20 } },
          audio: true,
        })
      }
      mediaRef.current = mediaStream
      setStream(mediaStream)
      setIsBroadcasting(true)

      const name = `stream-${matchId}`
      // Supprimer tout canal fantôme
      const stale = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
      if (stale) await supabase.removeChannel(stale)

      const channel = supabase.channel(name, { config: { presence: { key: user?.id || 'bc' } } })
      channelRef.current = channel

      const updateViewerCount = () => {
        if (!channelRef.current) return
        const state = channelRef.current.presenceState()
        const count = (Object.values(state) as any[]).reduce((acc: number, list: any) => {
          const isViewer = list.some((p: any) => p.is_viewer)
          return acc + (isViewer ? 1 : 0)
        }, 0)
        setViewerCount(count)
      }

      channel
        .on('presence', { event: 'sync' }, () => {
          updateViewerCount()
        })
        .on('broadcast', { event: 'viewer-join' }, ({ payload }) => {
          console.log('📡 [BC] viewer-join from', payload.viewerId)
          createPeerForViewer(channel, payload.viewerId)
          setTimeout(updateViewerCount, 500)
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          const pc = peersRef.current.get(payload.viewerId)
          if (!pc || pc.signalingState !== 'have-local-offer') return
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
            console.log('📡 [BC] answer set for', payload.viewerId)
            // Limiter le débit après la poignée de main
            setBitrate(pc, 800)
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
            // Mettre en buffer
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
          }
          // Re-tracker si reconnexion
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('📡 [BC] channel error — will retry on next SUBSCRIBED')
          }
        })
    } catch (err) {
      console.error('📡 [BC] startBroadcast error', err)
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions.")
    }
  }

  // ── Arrêter le broadcast ──────────────────────────────────────────────────
  const stopBroadcast = () => {
    mediaRef.current?.getTracks().forEach(t => t.stop())
    mediaRef.current = null
    setStream(null)
    setIsBroadcasting(false)
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
  }

  useEffect(() => () => { stopBroadcast() }, []) // eslint-disable-line

  return { stream, isBroadcasting, startBroadcast, stopBroadcast, viewerCount }
}

// ── useWebRTCViewer ───────────────────────────────────────────────────────────
export function useWebRTCViewer(matchId: string) {
  const { user } = useAuth()
  const [stream,  setStream]  = useState<MediaStream | null>(null)
  const [isLive,  setIsLive]  = useState(false)
  const [viewerCount, setViewerCount] = useState(0)

  const channelRef   = useRef<any>(null)
  const pcRef        = useRef<RTCPeerConnection | null>(null)
  const streamRef    = useRef<MediaStream | null>(null)   // no stale closure
  const iceBufRef    = useRef<RTCIceCandidateInit[]>([])  // pre-answer buffer
  const retryRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const viewerId     = useRef(user?.id ?? Math.random().toString(36).slice(2)).current

  const clearRetry   = () => { if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null } }

  const sendJoin = (channel: any, delay = 0) => {
    clearRetry()
    retryRef.current = setTimeout(() => {
      if (!channelRef.current) return

      if (retryCountRef.current >= 8) {
        console.log('📡 [V] max join retries reached (8) — stopping join attempts')
        return
      }

      console.log(`📡 [V] viewer-join (attempt ${retryCountRef.current + 1}) →`, viewerId)
      channel.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId } })
      retryCountRef.current++

      // Calculer un exponential backoff : 5s, 7.5s, 11.25s, 16.8s... bridé à maximum 30s
      const nextDelay = Math.min(5000 * Math.pow(1.5, retryCountRef.current), 30000)

      retryRef.current = setTimeout(() => {
        if (!streamRef.current && channelRef.current) {
          console.log(`📡 [V] no stream after 5s — retrying in ${Math.round(nextDelay)}ms`)
          sendJoin(channel, nextDelay)
        }
      }, 5000)
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

    const channel = supabase.channel(`stream-${matchId}`, {
      config: { presence: { key: user?.id ?? 'viewer' } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const hasBc = Object.values(state).some((list: any) =>
          list.some((p: any) => p.is_broadcaster)
        )
        console.log('📡 [V] presence sync — broadcaster:', hasBc)
        setIsLive(hasBc)

        // Compter les spectateurs
        const count = (Object.values(state) as any[]).reduce((acc: number, list: any) => {
          const isViewer = list.some((p: any) => p.is_viewer)
          return acc + (isViewer ? 1 : 0)
        }, 0)
        setViewerCount(count)

        if (hasBc && !streamRef.current && !pcRef.current) {
          sendJoin(channel)
        } else if (!hasBc) {
          clearRetry()
          closePc()
          streamRef.current = null
          setStream(null)
          retryCountRef.current = 0 // Réinitialiser les tentatives !
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
          console.log('📡 [V] 🎉 stream received!')
          streamRef.current = e.streams[0]
          setStream(e.streams[0])
          clearRetry()
          retryCountRef.current = 0 // Réinitialiser à la réception du flux !
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
            // ICE restart léger après 3s
            setTimeout(() => {
              if (pc.connectionState !== 'connected' && channelRef.current) {
                console.log('📡 [V] disconnected — retrying join')
                closePc()
                streamRef.current = null
                setStream(null)
                sendJoin(channelRef.current)
              }
            }, 3000)
          }
          if (s === 'failed') {
            closePc()
            streamRef.current = null
            setStream(null)
            if (channelRef.current) sendJoin(channelRef.current, 1000)
          }
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          // Vider le buffer ICE pré-answer
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
        }
      })

    return () => {
      clearRetry()
      closePc()
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [matchId, viewerId]) // eslint-disable-line

  return { stream, isLive, viewerCount }
}
