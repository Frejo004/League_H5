/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// ── Précache (injection automatique par VitePWA) ──────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()
self.skipWaiting()

// ── Stratégies de cache runtime ───────────────────────────────────────────────

// Supabase API — Network First
registerRoute(
  ({ url }) => url.hostname.includes('.supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 })],
    networkTimeoutSeconds: 10,
  })
)

// Images Unsplash — Cache First
registerRoute(
  ({ url }) => url.hostname === 'images.unsplash.com',
  new CacheFirst({
    cacheName: 'hero-images',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  })
)

// Avatars Supabase Storage — Stale While Revalidate
registerRoute(
  ({ url }) => url.hostname.includes('.supabase.co') && url.pathname.includes('/storage/'),
  new StaleWhileRevalidate({
    cacheName: 'avatars',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 })],
  })
)

// ── Notifications Push ────────────────────────────────────────────────────────

// Reçoit les messages de l'app principale pour afficher une notification
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url, icon } = event.data
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        tag: tag || 'league-h5',
        icon: icon || '/logo-h5.png',
        badge: '/logo-h5.png',
        data: { url: url || '/' },
        requireInteraction: false,
        silent: false,
      })
    )
  }

  // Gestion de la mise à jour : skipWaiting demandé par l'app
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Clic sur la notification → ouvre/focus l'onglet de l'app
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) (client as WindowClient).navigate(url)
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

// Vraies notifications push serveur (futur — VAPID)
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return
  try {
    const data = event.data.json() as { title?: string; body?: string; tag?: string; url?: string }
    event.waitUntil(
      self.registration.showNotification(data.title || 'League H5', {
        body: data.body || '',
        icon: '/logo-h5.png',
        badge: '/logo-h5.png',
        tag: data.tag || 'league-h5-push',
        data: { url: data.url || '/' },
      })
    )
  } catch {
    // Ignore parse errors
  }
})
