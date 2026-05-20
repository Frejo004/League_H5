/**
 * useCameraDevices — Énumère les caméras et micros disponibles
 *
 * Sur iOS/Safari, enumerateDevices() ne retourne les labels qu'APRÈS
 * avoir obtenu la permission caméra. Ce hook gère ce cas en deux phases :
 *   1. Appel initial sans permission → labels vides
 *   2. Après getUserMedia() → relance l'énumération avec les vrais labels
 *
 * Usage :
 *   const { videoDevices, audioDevices, refresh } = useCameraDevices()
 */
import { useState, useEffect, useCallback } from 'react'

export interface MediaDeviceInfo2 {
  deviceId: string
  label: string
  kind: 'videoinput' | 'audioinput'
}

export function useCameraDevices() {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo2[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo2[]>([])
  const [hasPermission, setHasPermission] = useState(false)

  const enumerate = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()

      const videos = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          kind: 'videoinput' as const,
          // Sur iOS sans permission, label est vide → on génère un label lisible
          label: d.label || `Caméra ${i + 1}`,
        }))

      const audios = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          kind: 'audioinput' as const,
          label: d.label || `Micro ${i + 1}`,
        }))

      setVideoDevices(videos)
      setAudioDevices(audios)
    } catch (err) {
      console.warn('[useCameraDevices] enumerateDevices error', err)
    }
  }, [])

  // Énumération initiale (labels vides sur iOS avant permission)
  useEffect(() => {
    enumerate()
    navigator.mediaDevices.addEventListener('devicechange', enumerate)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate)
  }, [enumerate])

  // Demander la permission et ré-énumérer pour obtenir les vrais labels
  // Appelé manuellement quand l'utilisateur ouvre le panneau de sélection
  const requestPermissionAndRefresh = useCallback(async () => {
    try {
      // Demande minimale juste pour déclencher la permission
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      tempStream.getTracks().forEach(t => t.stop())
      setHasPermission(true)
      await enumerate()
    } catch (err) {
      console.warn('[useCameraDevices] permission denied', err)
    }
  }, [enumerate])

  return {
    videoDevices,
    audioDevices,
    hasPermission,
    refresh: requestPermissionAndRefresh,
  }
}
