/**
 * sw-notifications.js — Service Worker dédié aux notifications push
 * Gère l'affichage des notifications même quand l'app est fermée.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Écoute les messages envoyés depuis l'app principale
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url, icon } = event.data
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        tag: tag || 'league-h5',
        icon: icon || '/logo-h5.png',
        badge: '/logo-h5.png',
        data: { url },
        requireInteraction: false,
        silent: false,
      })
    )
  }
})

// Clic sur la notification → ouvre/focus l'onglet de l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si un onglet de l'app est déjà ouvert, le focus
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(url)
          return
        }
      }
      // Sinon ouvrir un nouvel onglet
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

// Push events (pour les vraies notifications serveur avec VAPID — futur)
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title || 'League H5', {
        body: data.body || '',
        icon: data.icon || '/logo-h5.png',
        badge: '/logo-h5.png',
        tag: data.tag || 'league-h5-push',
        data: { url: data.url || '/' },
      })
    )
  } catch {
    // Ignore parse errors
  }
})
