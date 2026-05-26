/**
 * useNotificationSW — Gestion du Service Worker de notifications
 *
 * Enregistre sw-notifications.js et fournit une fonction sendNotification()
 * qui utilise le SW quand disponible (pour iOS/Android PWA),
 * et fait fallback sur new Notification() en web desktop.
 */

import { useState, useEffect, useCallback } from 'react'

let swRegistration: ServiceWorkerRegistration | null = null

// Enregistrement unique du SW
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration
  if (!('serviceWorker' in navigator)) return null

  try {
    const reg = await navigator.serviceWorker.register('/sw-notifications.js', {
      scope: '/',
      updateViaCache: 'none',
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

export function useNotificationSW() {
  const [permission, setPermission] = useState<NotifPermission>(getNotificationPermission)
  const [swReady, setSwReady] = useState(false)

  // Pré-enregistrer le SW dès le montage
  useEffect(() => {
    getSwRegistration().then((reg) => setSwReady(!!reg))
  }, [])

  // Demander la permission et retourner le résultat
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') {
      setPermission('granted')
      return true
    }
    if (Notification.permission === 'denied') {
      setPermission('denied')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result as NotifPermission)
    return result === 'granted'
  }, [])

  /**
   * Affiche une notification — via SW si disponible (requis pour iOS PWA),
   * sinon via l'API Notification directement.
   * Fonctionne que l'app soit visible ou non.
   */
  const sendNotification = useCallback(async (
    title: string,
    body: string,
    options?: { tag?: string; url?: string; icon?: string; force?: boolean }
  ) => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    // Si l'app est au premier plan et qu'on ne force pas → pas de notif système
    // (le badge dans l'UI suffit)
    if (document.visibilityState === 'visible' && !options?.force) return

    const reg = await getSwRegistration()

    if (reg?.active) {
      // Via Service Worker → fonctionne sur iOS PWA et quand app est fermée
      reg.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag: options?.tag,
        url: options?.url,
        icon: options?.icon ?? '/logo-h5.png',
      })
    } else {
      // Fallback web desktop
      const n = new Notification(title, {
        body,
        icon: options?.icon ?? '/logo-h5.png',
        badge: '/logo-h5.png',
        tag: options?.tag,
      })
      if (options?.url) { // TODO: Envisager d'utiliser la fonction `navigate` de React Router pour les URLs internes afin d'éviter un rechargement complet de la page.
        n.onclick = () => {
          window.focus(); window.location.href = options.url!; n.close()
        }
      }
    }
  }, [])

  return {
    permission,
    swReady,
    isSupported: typeof Notification !== 'undefined',
    requestPermission,
    sendNotification,
  }
}
