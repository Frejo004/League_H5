import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

// ── Broadcaster ───────────────────────────────────────────────────────────────
export function useWebRTCBroadcaster(matchId: string) {
  const { user } = useAuth()
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const channelRef = useRef<any>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const startBroadcast = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      })
      mediaStreamRef.current = mediaStream
      setStream(mediaStream)
      setIsBroadcasting(true)

      // Remove any stale channel with this name before creating a fresh one
      const channelName = `stream-${matchId}`
      const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`)
      if (existing) {
        console.log('📡 Broadcaster: removing stale channel before starting')
        await supabase.removeChannel(existing)
      }

      const channel = supabase.channel(channelName)
      channelRef.current = channel

      channel
        .on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
          const viewerId = payload.viewerId
          console.log('📡 Broadcaster: viewer-join from', viewerId)

          // Close any existing PC for this viewer (handle retries)
          if (peerConnections.current.has(viewerId)) {
            peerConnections.current.get(viewerId)?.close()
            peerConnections.current.delete(viewerId)
          }

          const pc = new RTCPeerConnection(STUN_SERVERS)
          peerConnections.current.set(viewerId, pc)

          mediaStreamRef.current!.getTracks().forEach(track =>
            pc.addTrack(track, mediaStreamRef.current!)
          )

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'ice-candidate',
                payload: { target: viewerId, candidate: e.candidate, from: 'broadcaster' }
              })
            }
          }

          pc.onconnectionstatechange = () => {
            console.log('📡 Broadcaster: PC state for', viewerId, ':', pc.connectionState)
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              peerConnections.current.delete(viewerId)
            }
          }

          try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            channel.send({
              type: 'broadcast',
              event: 'offer',
              payload: { target: viewerId, offer }
            })
            console.log('📡 Broadcaster: offer sent to', viewerId)
          } catch (err) {
            console.error('📡 Broadcaster: failed to create offer', err)
          }
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          console.log('📡 Broadcaster: answer from', payload.viewerId)
          const pc = peerConnections.current.get(payload.viewerId)
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.target === 'broadcaster') {
            const pc = peerConnections.current.get(payload.from)
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
              } catch (err) {
                console.warn('📡 Broadcaster: ICE candidate error (ignored):', err)
              }
            }
          }
        })
        .subscribe(async (status) => {
          console.log('📡 Broadcaster: subscription status:', status)
          if (status === 'SUBSCRIBED') {
            await channel.track({ is_broadcaster: true, user_id: user?.id })
            console.log('📡 Broadcaster: presence tracked')
          }
        })

    } catch (err) {
      console.error('Failed to start broadcast', err)
      alert("Impossible d'accéder à la caméra.")
    }
  }

  const stopBroadcast = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current)
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    mediaStreamRef.current = null
    setStream(null)
    setIsBroadcasting(false)
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  // Dummy ref to satisfy TypeScript (stopBroadcast uses retryTimer which is viewer-only; keep broadcaster clean)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { stopBroadcast() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { stream, isBroadcasting, startBroadcast, stopBroadcast }
}

// ── Viewer ────────────────────────────────────────────────────────────────────
export function useWebRTCViewer(matchId: string) {
  const { user } = useAuth()
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLive, setIsLive] = useState(false)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)   // Mirrors stream state — no stale closure
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewerId = useRef(user?.id || Math.random().toString(36).substring(7)).current

  const sendViewerJoin = (channel: any) => {
    console.log('📡 Viewer: sending viewer-join, id:', viewerId)
    channel.send({ type: 'broadcast', event: 'viewer-join', payload: { viewerId } })
    // Retry if no stream arrives within 4 s
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => {
      if (!streamRef.current && channelRef.current) {
        console.log('📡 Viewer: retrying viewer-join (no stream after 4s)')
        sendViewerJoin(channelRef.current)
      }
    }, 4000)
  }

  useEffect(() => {
    if (!matchId) return

    const channel = supabase.channel(`stream-${matchId}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const broadcasterExists = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.is_broadcaster)
        )
        console.log('📡 Viewer: presence sync — broadcasterExists:', broadcasterExists)
        setIsLive(broadcasterExists)

        if (broadcasterExists && !streamRef.current && !pcRef.current) {
          sendViewerJoin(channel)
        } else if (!broadcasterExists) {
          if (retryTimer.current) clearTimeout(retryTimer.current)
          streamRef.current = null
          setStream(null)
          if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
        }
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.target !== viewerId) return
        console.log('📡 Viewer: received offer')
        if (retryTimer.current) clearTimeout(retryTimer.current)

        if (pcRef.current) { pcRef.current.close() }
        const pc = new RTCPeerConnection(STUN_SERVERS)
        pcRef.current = pc

        pc.ontrack = (e) => {
          console.log('📡 Viewer: GOT REMOTE TRACK 🎉', e.streams[0])
          streamRef.current = e.streams[0]
          setStream(e.streams[0])
        }
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { target: 'broadcaster', candidate: e.candidate, from: viewerId }
            })
          }
        }
        pc.onconnectionstatechange = () => {
          console.log('📡 Viewer: PC state:', pc.connectionState)
          if (pc.connectionState === 'failed') {
            pcRef.current = null
            // Retry the whole handshake
            if (channelRef.current) sendViewerJoin(channelRef.current)
          }
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'answer', payload: { viewerId, answer } })
          console.log('📡 Viewer: answer sent')
        } catch (err) {
          console.error('📡 Viewer: handshake error', err)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.target === viewerId && pcRef.current && pcRef.current.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } catch (err) {
            console.warn('📡 Viewer: ICE candidate error (ignored):', err)
          }
        }
      })
      .subscribe(async (status) => {
        console.log('📡 Viewer: subscription status:', status)
        if (status === 'SUBSCRIBED') {
          await channel.track({ is_viewer: true, user_id: user?.id })
          console.log('📡 Viewer: presence tracked')
        }
      })

    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
      supabase.removeChannel(channel)
      if (pcRef.current) { pcRef.current.close() }
    }
  }, [matchId, viewerId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { stream, isLive }
}
