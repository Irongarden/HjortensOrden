// SW kill-switch v4 – contains ONLY kill-switch logic.
// No workbox, no importScripts, no precache. Nothing to fail on.
console.log('[SW] kill-switch v4 loaded')

self.addEventListener('install', () => {
  console.log('[SW] skipWaiting')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] activate – clearing all caches and unregistering')
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        clients.forEach((client) => {
          try { client.navigate(client.url) } catch (_) {}
        })
      })
      .then(() => {
        console.log('[SW] unregistering self')
        return self.registration.unregister()
      })
  )
})
