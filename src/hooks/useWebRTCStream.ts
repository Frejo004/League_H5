import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── ICE servers : STUN public + TURN fallback ────────────────────────────────
// Les serveurs STUN seuls échouent derrière certains NAT/firewalls.
// On ajoute les TURN publics de Metered pour garantir la connexion.
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN publics gratuits (fallback NAT symétrique)
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
  iceCandidatePoolSize: 5,       // réduit de 10 → 5 : moins de candidats inutiles à négocier
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

// ── Contraintes vidéo optimisées : 360p @ 15fps ──────────────────────────────
// 360p au lieu de 480p : -40% de pixels à encoder → upload admin divisé par ~1.5
// 15fps maintenu : bon compromis fluidité/latence pour du sport filmé sur mobile
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width:  { ideal: 640, max: 854 },
  height: { ideal: 360, max: 480 },
  frameRate: { ideal: 15, max: 20 },
}



// ── Appliquer les paramètres d'encodage après la poignée de main ─────────────
async function applyEncodingParams(pc: RTCPeerConnection) {
  for (const sender of pc.getSenders()) {
    try {
      const params = sender.getParameters()
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}]
      }
      const enc = params.encodings[0]

      if (sender.track?.kind === 'video') {
        enc.maxBitrate    = 400_000   // 400 kbps (était 800) → upload admin ÷2
        enc.maxFramerate  = 15
        enc.priority      = 'medium'
        // scaleResolutionDownBy : si la bande passante est insuffisante,
        // le navigateur réduit automatiquement la résolution plutôt que de couper
        enc.scaleResolutionDownBy = 1.0
      }

      if (sender.track?.kind === 'audio') {
        enc.priority         = 'high'   // le son passe avant la vidéo en cas de congestion
        enc.networkPriority  = 'high' as any
      }

      await sender.setParameters(params)
    } catch {
      // Certains navigateurs ne supportent pas tous les champs — on ignore silencieusement
    }
  }
  console.log('📡 [BC] encoding params applied (400kbps video, high-prio audio)')
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

  const channelRef  = useRef<any>(null)
  const mediaRef    = useRef<MediaStream | null>(null)
  const peersRef    = useRef<Map<string, RTCPeerConnection>>(new Map())
  const iceBufRef   = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())

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

    mediaRef.current!.getTracks().forEach(t => {
      const sender = pc.addTrack(t, mediaRef.current!)
      if (t.kind === 'video') {
        try {
          const params = sender.getParameters()
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
        // ICE restart après 2s (était 3s)
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            console.log(`📡 [BC] ICE restart for ${viewerId}`)
            createPeerForViewer(channel, viewerId)
          }
        }, 2_000)
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
          video: VIDEO_CONSTRAINTS,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } catch {
        // Fallback contraintes minimales
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15 } },
          audio: true,
        })
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

      const channel = supabase.channel(name, { config: { presence: { key: user?.id || 'bc' } } })
      channelRef.current = channel

      const updateViewerCount = () => {
        if (!channelRef.current) return
        const state = channelRef.current.presenceState()
        const count = (Object.values(state) as any[]).reduce((acc: number, list: any) => {
          return acc + (list.some((p: any) => p.is_viewer) ? 1 : 0)
        }, 0)
        setViewerCount(count)
      }

      channel
        .on('presence', { event: 'sync' }, updateViewerCount)
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
            // Appliquer les paramètres d'encodage optimisés après la poignée de main
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
          }
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
  const [stream, setStream]           = useState<MediaStream | null>(null)
  const [isLive, setIsLive]           = useState(false)
  const [viewerCount, setViewerCount] = useState(0)

  const channelRef      = useRef<any>(null)
  const pcRef           = useRef<RTCPeerConnection | null>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const iceBufRef       = useRef<RTCIceCandidateInit[]>([])
  const retryRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef   = useRef(0)
  const viewerId        = useRef(user?.id ?? Math.random().toString(36).slice(2)).current

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
      console.log(`📡 [V] viewer-join (attempt ${retryCountRef.current + 1}) →`, viewerId)
      channel.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId } })
      retryCountRef.current++

      // Backoff exponentiel : 2s, 3s, 4.5s, 6.75s... max 20s
      // (était 5s fixe → reconnexion 2.5x plus rapide au premier essai)
      const nextDelay = Math.min(2_000 * Math.pow(1.5, retryCountRef.current), 20_000)

      retryRef.current = setTimeout(() => {
        if (!streamRef.current && channelRef.current) {
          console.log(`📡 [V] no stream after 2s — retrying in ${Math.round(nextDelay)}ms`)
          sendJoin(channel, nextDelay)
        }
      }, 2_000)  // était 5000 → 2000 : détecte plus vite si l'offer n'arrive pas
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
        setIsLive(hasBc)

        const count = (Object.values(state) as any[]).reduce((acc: number, list: any) => {
          return acc + (list.some((p: any) => p.is_viewer) ? 1 : 0)
        }, 0)
        setViewerCount(count)

        if (hasBc && !streamRef.current && !pcRef.current) {
          sendJoin(channel)
        } else if (!hasBc) {
          clearRetry()
          closePc()
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

        // Hint décodeur : favoriser la fluidité côté spectateur
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
            // Reconnexion après 2s (était 3s)
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
