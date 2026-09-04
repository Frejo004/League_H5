import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { loadMeteredSdk } from '@/lib/meteredLoader'
import { useAppToast } from '@/hooks/useAppToast'

// ── Nombre maximum de viewers simultanés ───────────────────────────────────
// Avec Metered SFU, cette limite peut être beaucoup plus haute (ex: 1000)

// ── Durée max du buffer DVR côté viewer (en secondes) ───────────────────────
const DVR_BUFFER_SECONDS = 300 // 5 minutes de retour en arrière possible

// ── useWebRTCBroadcaster ──────────────────────────────────────────────────────
type NetworkQuality = 'good' | 'degraded' | 'poor'
type RemoteTrackItem = {
  type: 'video' | 'audio'
  track: MediaStreamTrack
}

export function useWebRTCBroadcaster(matchId: string, options?: {
  onError?: (message: string, detail?: string) => void
  videoDeviceId?: string
  audioDeviceId?: string
}) {
  const { toast } = useAppToast()
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const networkQuality: NetworkQuality = 'good'
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const meetingRef = useRef<MeteredMeeting | null>(null)

  const stopBroadcast = useCallback(async () => {
    if (meetingRef.current) {
      try {
        await meetingRef.current.leaveMeeting()
      } catch (e) {
        console.warn('📡 [BC] leave error', e)
      }
      meetingRef.current = null
    }
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setIsBroadcasting(false)
    setViewerCount(0)
  }, [stream])

  const startBroadcast = async () => {
    try {
      // 1. Récupérer la config de la room via l'Edge Function
      const { data, error } = await supabase.functions.invoke('get-metered-config', {
        body: { matchId }
      })
      if (error) {
        // Extraire le message détaillé depuis le body de la réponse 500
        const detail = (error as { context?: Response })?.context
          ? await (error as { context: Response }).context.json().catch(() => ({}))
          : {}
        console.error('📡 [BC] Edge Function error detail:', detail)
        throw new Error(detail?.error || error.message)
      }
      // supabase.functions.invoke ne lève pas d'erreur sur HTTP 500 — vérifier manuellement
      if (data?.error) throw new Error(data.error)
      if (!data?.roomURL) throw new Error('Aucune roomURL retournée par l\'edge function')

      const { roomURL } = data

      // 2. Initialiser le meeting (SDK chargé à la demande — voir meteredLoader.ts)
      const loaded = await loadMeteredSdk()
      if (!loaded || !window.Metered?.Meeting) throw new Error('SDK Metered indisponible')
      const meeting = new window.Metered.Meeting()
      meetingRef.current = meeting

      // 3. Rejoindre la room
      await meeting.join({
        roomURL,
        name: 'Admin'
      })

      // 4. Configurer les devices
      if (options?.videoDeviceId) {
        await meeting.chooseVideoInputDevice(options.videoDeviceId)
      }
      if (options?.audioDeviceId) {
        await meeting.chooseAudioInputDevice(options.audioDeviceId)
      }

      // 5. Démarrer la vidéo et l'audio
      await meeting.startVideo()
      await meeting.unmuteLocalAudio()

      // 6. Récupérer le flux local pour la preview en haute qualité
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: options?.videoDeviceId
          ? { deviceId: { exact: options.videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : { facingMode: 'environment',                  width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: options?.audioDeviceId
          ? { deviceId: { exact: options.audioDeviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      })

      setStream(localStream)
      setIsBroadcasting(true)

      // 7. Écouter les participants pour le viewerCount
      const updateCount = async () => {
        if (!meetingRef.current) return
        const p = await meetingRef.current.getParticipants()
        setViewerCount(Math.max(0, p.length - 1))
      }
      meeting.on("participantJoined", updateCount)
      meeting.on("participantLeft", updateCount)

    } catch (err) {
      console.error('📡 [BC] startBroadcast error', err)
      const notify = options?.onError ?? ((msg: string, det?: string) => toast.error(msg, det))
      notify('Impossible de démarrer le live via Metered', err instanceof Error ? err.message : 'Erreur inconnue')
      stopBroadcast()
    }
  }

  const switchCamera = useCallback(async () => {
    if (!meetingRef.current) return
    const newFacing: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment'
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')
      // Essayer de trouver une caméra qui correspond au nouveau facingMode
      const target = cameras.find(c => c.label.toLowerCase().includes(newFacing === 'environment' ? 'back' : 'front')) 
                     || cameras.find(c => c.label.toLowerCase().includes(newFacing === 'environment' ? 'rear' : 'selfie'))
                     || cameras[0]

      if (target) {
        await meetingRef.current.chooseVideoInputDevice(target.deviceId)
        setFacingMode(newFacing)
        
        // Mettre à jour la preview locale en haute qualité
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: target.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false
        })
        const videoTrack = newStream.getVideoTracks()[0]
        if (stream && videoTrack) {
          const oldTrack = stream.getVideoTracks()[0]
          if (oldTrack) {
            oldTrack.stop()
            stream.removeTrack(oldTrack)
          }
          stream.addTrack(videoTrack)
          setStream(new MediaStream(stream.getTracks()))
        }
      }
    } catch (err) {
      console.error('📡 [BC] switchCamera error', err)
    }
  }, [facingMode, stream])

  useEffect(() => () => { stopBroadcast() }, []) // eslint-disable-line

  return { stream, isBroadcasting, startBroadcast, stopBroadcast, viewerCount, networkQuality, switchCamera, facingMode }
}

// ── useWebRTCViewer ───────────────────────────────────────────────────────────
export function useWebRTCViewer(matchId: string) {
  const [stream, setStream]           = useState<MediaStream | null>(null)
  const [isLive, setIsLive]           = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'idle'>('idle')
  const isStreamFull = false

  const [dvrEnabled,   setDvrEnabled]   = useState(false)
  const [dvrOffset,    setDvrOffset]    = useState(0)
  const [dvrDuration,  setDvrDuration]  = useState(0)
  const [dvrBlobUrl,   setDvrBlobUrl]   = useState<string | null>(null)
  const [dvrPlaybackStartTs, setDvrPlaybackStartTs] = useState<number | null>(null)

  const meetingRef = useRef<MeteredMeeting | null>(null)
  const remoteStreamRef = useRef<MediaStream>(new MediaStream())

  // DVR refs
  const recorderRef       = useRef<MediaRecorder | null>(null)
  const dvrChunksRef      = useRef<{ blob: Blob; ts: number; isInit: boolean }[]>([])
  const dvrActiveRef      = useRef(false)
  const initChunkRef      = useRef<Blob | null>(null)
  const mediaSourceRef    = useRef<MediaSource | null>(null)
  const sourceBufferRef   = useRef<SourceBuffer | null>(null)
  const appendQueueRef    = useRef<Blob[]>([])
  const isAppendingRef    = useRef(false)

  // ── Gérer la file d'attente d'ajouts MediaSource ──────────────────────────
  const processAppendQueue = useCallback(() => {
    const sb = sourceBufferRef.current
    if (!sb || sb.updating || isAppendingRef.current) return
    if (appendQueueRef.current.length === 0) return

    const ms = mediaSourceRef.current
    if (!ms || ms.readyState !== 'open') {
      appendQueueRef.current = []
      isAppendingRef.current = false
      return
    }

    const blob = appendQueueRef.current.shift()!
    const reader = new FileReader()
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) return
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
        console.error('📡 [DVR] appendBuffer error', err)
        isAppendingRef.current = false
        appendQueueRef.current = []
      }
    }
    reader.readAsArrayBuffer(blob)
  }, [])

  const closeMediaSource = useCallback(() => {
    appendQueueRef.current = []
    isAppendingRef.current = false
    if (sourceBufferRef.current) {
      try {
        const ms = mediaSourceRef.current
        if (ms && ms.readyState === 'open') ms.removeSourceBuffer(sourceBufferRef.current)
      } catch {
        console.warn('📡 [DVR] removeSourceBuffer ignored')
      }
      sourceBufferRef.current = null
    }
    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === 'open') mediaSourceRef.current.endOfStream()
      } catch { /* ignore */ }
      mediaSourceRef.current = null
    }
    setDvrBlobUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const startDvrRecording = useCallback((liveStream: MediaStream) => {
    if (recorderRef.current) {
      if (recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop() } catch { /* ignore */ }
      }
      recorderRef.current = null
      initChunkRef.current = null
      dvrChunksRef.current = []
    }

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(m => MediaRecorder.isTypeSupported(m)) ?? ''

    if (!mimeType) return

    const recorder = new MediaRecorder(liveStream, {
      mimeType,
      videoBitsPerSecond: 2_500_000, // 2.5 Mbps — qualité suffisante pour du sport
    })
    recorderRef.current = recorder
    let isFirstChunk = true

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return
      const now = Date.now()
      if (isFirstChunk) {
        initChunkRef.current = e.data
        isFirstChunk = false
        dvrChunksRef.current = [{ blob: e.data, ts: now, isInit: true }]
        return
      }
      dvrChunksRef.current.push({ blob: e.data, ts: now, isInit: false })
      if (dvrActiveRef.current && sourceBufferRef.current) {
        appendQueueRef.current.push(e.data)
        processAppendQueue()
      }
      const cutoff = now - DVR_BUFFER_SECONDS * 1000
      dvrChunksRef.current = dvrChunksRef.current.filter(c => c.isInit || c.ts >= cutoff)
      const dataChunks = dvrChunksRef.current.filter(c => !c.isInit)
      if (dataChunks.length > 0) {
        setDvrDuration(Math.round((now - dataChunks[0].ts) / 1000))
      }
    }
    recorder.start(1_000)
    console.log('📡 [DVR] enregistrement démarré')
  }, [processAppendQueue])

  const stopDvrRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch { /* ignore */ }
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

  const seekDvr = useCallback((offsetSeconds: number) => {
    if (offsetSeconds <= 0) {
      dvrActiveRef.current = false
      setDvrEnabled(false)
      setDvrOffset(0)
      closeMediaSource()
      setDvrPlaybackStartTs(null)
      return
    }
    const initChunk = initChunkRef.current
    if (!initChunk) return
    const dataChunks = dvrChunksRef.current.filter(c => !c.isInit)
    if (dataChunks.length === 0) return
    const now = Date.now()
    const targetTs = now - offsetSeconds * 1000
    let startIdx = dataChunks.findIndex(c => c.ts >= targetTs)
    if (startIdx === -1) startIdx = 0
    const selectedDataChunks = dataChunks.slice(startIdx)
    setDvrPlaybackStartTs(selectedDataChunks[0].ts)
    const mimeType = recorderRef.current?.mimeType ?? 'video/webm'

    if (typeof window !== 'undefined' && 'MediaSource' in window && MediaSource.isTypeSupported(mimeType)) {
      closeMediaSource()
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
          appendQueueRef.current = [initChunk, ...selectedDataChunks.map(c => c.blob)]
          processAppendQueue()
        } catch (err) {
          console.error('📡 [DVR] MSE error', err)
        }
      })
      dvrActiveRef.current = true
      setDvrEnabled(true)
      setDvrOffset(offsetSeconds)
      setDvrBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    }
  }, [processAppendQueue, closeMediaSource])

  useEffect(() => {
    if (!matchId) return

    const joinRoom = async () => {
      try {
        // Vérifier que le SDK Metered est bien chargé
        if (typeof Metered === 'undefined' || !Metered?.Meeting) {
          console.warn('📡 [V] SDK Metered non disponible')
          setConnectionState('failed')
          return
        }
        const { data, error } = await supabase.functions.invoke('get-metered-config', {
          body: { matchId }
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        if (!data?.roomURL) throw new Error('Aucune roomURL retournée par l\'edge function')

        const loaded = await loadMeteredSdk()
        if (!loaded || !window.Metered?.Meeting) throw new Error('SDK Metered indisponible')
        const meeting = new window.Metered.Meeting()
        meetingRef.current = meeting

        await meeting.join({ roomURL: data.roomURL, name: `Viewer-${Math.random().toString(36).slice(2, 6)}` })
        setIsLive(true)
        setConnectionState('connected')

        const updateCount = async () => {
          const p = await meeting.getParticipants()
          setViewerCount(p.length)
        }
        meeting.on("participantJoined", updateCount)
        meeting.on("participantLeft", updateCount)

        meeting.on("remoteTrackStarted", (trackItem: RemoteTrackItem) => {
          if (trackItem.type === "video") {
            remoteStreamRef.current.getVideoTracks().forEach(t => t.stop())
            remoteStreamRef.current.addTrack(trackItem.track)
          } else {
            remoteStreamRef.current.getAudioTracks().forEach(t => t.stop())
            remoteStreamRef.current.addTrack(trackItem.track)
          }
          
          if (remoteStreamRef.current.getTracks().length > 0) {
            const newStream = new MediaStream(remoteStreamRef.current.getTracks())
            setStream(newStream)
            startDvrRecording(newStream)
          }
        })

        meeting.on("remoteTrackStopped", () => {
          // Si plus de tracks, on considère que le live est fini ou coupé
          meeting.getParticipants().then(participants => {
            const hasBroadcaster = participants.some(p => p.name === 'Admin')
            if (!hasBroadcaster) {
              setStream(null)
              stopDvrRecording()
            }
          })
        })

      } catch (err) {
        console.error('📡 [V] Metered join error', err)
        setIsLive(false)
        setConnectionState('failed')
      }
    }

    joinRoom()

    return () => {
      if (meetingRef.current) meetingRef.current.leaveMeeting()
      stopDvrRecording()
      setStream(null)
      setIsLive(false)
    }
  }, [matchId]) // eslint-disable-line

  return {
    stream, isLive, viewerCount, isStreamFull, connectionState,
    dvrEnabled, dvrOffset, dvrDuration, dvrBlobUrl, seekDvr, dvrPlaybackStartTs,
  }
}

// ── useWebRTCPresence ─────────────────────────────────────────────────────────
export function useWebRTCPresence(matchId: string) {
  const [isLive, setIsLive]           = useState(false)
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    if (!matchId) return
    const joinPresence = async () => {
      try {
        const loaded = await loadMeteredSdk()
        if (!loaded || !window.Metered?.Meeting) {
          console.warn('📡 [Presence] SDK Metered non disponible')
          return null
        }
        const { data, error } = await supabase.functions.invoke('get-metered-config', { body: { matchId } })
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        if (!data?.roomURL) throw new Error('Aucune roomURL retournée par l\'edge function')
        const meeting = new window.Metered.Meeting()
        await meeting.join({ roomURL: data.roomURL, name: 'Presence-Tracker' })
        const update = async () => {
          try {
            const p = await meeting.getParticipants()
            setIsLive(p.some(participant => participant.name === 'Admin'))
            setViewerCount(p.length)
          } catch (e) {
            console.warn('📡 [Presence] getParticipants error', e)
          }
        }
        meeting.on("participantJoined", update)
        meeting.on("participantLeft", update)
        update()
        return meeting
      } catch (e) {
        console.warn('📡 [Presence] join error', e)
        return null
      }
    }
    const meetingPromise = joinPresence()
    return () => { meetingPromise.then(m => m?.leaveMeeting()) }
  }, [matchId])

  return { isLive, viewerCount }
}
