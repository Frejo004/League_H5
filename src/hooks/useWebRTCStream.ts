import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

export function useWebRTCBroadcaster(matchId: string) {
  const { user } = useAuth()
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const channelRef = useRef<any>(null)

  const startBroadcast = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      })
      setStream(mediaStream)
      setIsBroadcasting(true)

      const channel = supabase.channel(`stream-${matchId}`)
      channelRef.current = channel

      channel
        .on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
          const viewerId = payload.viewerId
          if (peerConnections.current.has(viewerId)) return

          const pc = new RTCPeerConnection(STUN_SERVERS)
          peerConnections.current.set(viewerId, pc)

          mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream))

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'ice-candidate',
                payload: { target: viewerId, candidate: e.candidate, from: 'broadcaster' }
              })
            }
          }

          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { target: viewerId, offer }
          })
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          const pc = peerConnections.current.get(payload.viewerId)
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.target === 'broadcaster') {
            const pc = peerConnections.current.get(payload.from)
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            }
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ is_broadcaster: true, user_id: user?.id })
          }
        })

    } catch (err) {
      console.error('Failed to start broadcast', err)
      alert('Impossible d\'accéder à la caméra.')
    }
  }

  const stopBroadcast = () => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setIsBroadcasting(false)
    
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }
  }

  useEffect(() => {
    return () => {
      stopBroadcast()
    }
  }, [])

  return { stream, isBroadcasting, startBroadcast, stopBroadcast }
}

export function useWebRTCViewer(matchId: string) {
  const { user } = useAuth()
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLive, setIsLive] = useState(false)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<any>(null)
  const viewerId = useRef(user?.id || Math.random().toString(36).substring(7)).current

  useEffect(() => {
    const channel = supabase.channel(`stream-${matchId}`)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const broadcasterExists = Object.values(state).some((presences: any) => 
          presences.some((p: any) => p.is_broadcaster)
        )
        
        setIsLive(broadcasterExists)

        // Si le broadcaster est là mais qu'on n'a pas de stream, on demande à rejoindre
        if (broadcasterExists && !stream && !pcRef.current) {
          channel.send({
            type: 'broadcast',
            event: 'viewer-join',
            payload: { viewerId }
          })
        } else if (!broadcasterExists) {
          // Broadcaster est parti
          setStream(null)
          if (pcRef.current) {
            pcRef.current.close()
            pcRef.current = null
          }
        }
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.target !== viewerId) return

        if (pcRef.current) {
          pcRef.current.close()
        }

        const pc = new RTCPeerConnection(STUN_SERVERS)
        pcRef.current = pc

        pc.ontrack = (e) => {
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

        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { viewerId, answer }
        })
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.target === viewerId && pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (pcRef.current) {
        pcRef.current.close()
      }
    }
  }, [matchId, viewerId])

  return { stream, isLive }
}
