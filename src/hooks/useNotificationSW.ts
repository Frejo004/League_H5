/**
 * useNotificationSW — Gestion du Service Worker de notifications
 *
 * Enregistre sw-notifications.js et fournit une fonction sendNotification()
 * qui utilise le SW quand disponible (pour iOS/Android PWA),
 * et fait fallback sur new Notification() en web desktop.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

let swRegistration: ServiceWorkerRegistration | null = null

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Helper pour convertir la clé VAPID base64 en Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Enregistrement unique du SW
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration
  if (!('serviceWorker' in navigator)) return null

  try {
    // On cherche d'abord si un SW est déjà enregistré (VitePWA utilise /sw.js en prod)
    const regs = await navigator.serviceWorker.getRegistrations()
    const existing = regs.find(r => r.active || r.waiting || r.installing)
    if (existing) {
      swRegistration = existing
      return existing
    }

    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    swRegistration = reg
    return reg
  } catch (err) {
    console.warn('[NotifSW] Impossible d\'enregistrer le SW:', err)
    return null
  }
}

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported'

function getNotificationPermission(): NotifPermission {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as NotifPermission
}

export function useNotificationSW(userId?: string) {
  const [permission, setPermission] = useState<NotifPermission>(getNotificationPermission)
  const [swReady, setSwReady] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Pré-enregistrer le SW dès le montage
  useEffect(() => {
    getSwRegistration().then((reg) => setSwReady(!!reg))
  }, [])

  // Demander la permission et s'abonner au PushManager
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined' || !('PushManager' in window)) return false
    
    setIsSubscribing(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotifPermission)

      if (result === 'granted' && userId && VAPID_PUBLIC_KEY) {
        const reg = await getSwRegistration()
        if (reg) {
          // S'abonner au push server
          const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          })

          // Sauvegarder dans Supabase
          const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!)))
          const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!)))

          await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent.slice(0, 200),
          }, { onConflict: 'user_id,endpoint' })
        }
      }
      return result === 'granted'
    } catch (err) {
      console.error('[NotifSW] Erreur abonnement push:', err)
      return false
    } finally {
      setIsSubscribing(false)
    }
  }, [userId])

  /**
   * Affiche une notification — via SW si disponible (requis pour iOS PWA),
   * sinon via l'API Notification directement.
   */
  const sendNotification = useCallback(async (
    title: string,
    body: string,
    options?: { tag?: string; url?: string; icon?: string; force?: boolean }
  ) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    if (document.visibilityState === 'visible' && !options?.force) return

    const reg = await getSwRegistration()

    if (reg?.active) {
      reg.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag: options?.tag,
        url: options?.url,
        icon: options?.icon ?? '/logo-h5.png',
      })
    } else {
      const n = new Notification(title, {
        body,
        icon: options?.icon ?? '/logo-h5.png',
        badge: '/logo-h5.png',
        tag: options?.tag,
      })
      if (options?.url) {
        n.onclick = () => {
          window.focus(); window.location.href = options.url!; n.close()
        }
      }
    }
  }, [])

  return {
    permission,
    swReady,
    isSubscribing,
    isSupported: typeof Notification !== 'undefined' && 'PushManager' in window,
    requestPermission,
    sendNotification,
  }
}
