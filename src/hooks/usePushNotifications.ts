/**
 * usePushNotifications — Notifications push natives (Web Push API)
 *
 * Gère :
 * - Demande de permission
 * - Abonnement au service worker (PushManager)
 * - Sauvegarde de la subscription dans Supabase
 * - Envoi de notifications locales (sans serveur) pour les événements clés
 *
 * Note : Pour les notifications push "vraies" (envoyées depuis le serveur
 * quand l'app est fermée), il faudrait un backend avec VAPID keys.
 * En attendant, on utilise les notifications locales via le service worker
 * et les notifications web déjà en place dans useRealtime.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function usePushNotifications(userId?: string) {
  const [permission, setPermission] = useState<PushPermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Vérifier l'état initial
  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PushPermissionState)
  }, [])

  // Demander la permission et s'abonner
  const subscribe = useCallback(async () => {
    if (!userId || typeof Notification === 'undefined') return false
    setIsLoading(true)

    try {
      const result = await Notification.requestPermission()
      setPermission(result as PushPermissionState)

      if (result !== 'granted') return false

      // Enregistrer dans Supabase (subscription simplifiée sans VAPID)
      // On stocke juste le user_agent pour identifier l'appareil
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: `local-${userId}-${Date.now()}`,
        p256dh: 'local',
        auth: 'local',
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'user_id,endpoint' })

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('[Push] Erreur abonnement:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Envoyer une notification locale (quand l'app est en arrière-plan)
  const sendLocal = useCallback((title: string, body: string, options?: {
    tag?: string
    icon?: string
    url?: string
  }) => {
    if (permission !== 'granted') return
    if (document.visibilityState === 'visible') return // déjà visible

    const n = new Notification(title, {
      body,
      icon: options?.icon ?? '/logo-h5.png',
      badge: '/logo-h5.png',
      tag: options?.tag,
    })

    if (options?.url) {
      n.onclick = () => {
        window.focus()
        window.location.href = options.url!
        n.close()
      }
    }
  }, [permission])

  return {
    permission,
    isSubscribed: permission === 'granted',
    isLoading,
    isSupported: typeof Notification !== 'undefined',
    subscribe,
    sendLocal,
  }
}
