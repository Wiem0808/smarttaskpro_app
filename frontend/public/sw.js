// ══════════════════════════════════════════
// BNZ TASK — Service Worker (PWA)
// ══════════════════════════════════════════
const CACHE_NAME = 'bnz-task-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache
const PRE_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/logo-bnz.png',
];

// Install: pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE).catch(() => {
        // Silently fail if some assets aren't available yet
        console.log('[SW] Some pre-cache assets failed, continuing...');
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first strategy for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API calls: network only (don't cache API responses)
  if (url.pathname.startsWith('/api/')) return;

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/') || new Response(
              '<h1>BNZ TASK</h1><p>Vous êtes hors ligne.</p>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        });
    })
  );
});

// Push notifications (future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'BNZ TASK', {
      body: data.body || 'Nouvelle notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.url ? { url: data.url } : {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
