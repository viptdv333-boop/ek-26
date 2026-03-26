// ── Push notification handler (no Firebase SDK needed in SW) ─────
// Firebase client SDK handles token registration.
// The SW only needs to handle 'push' and 'notificationclick' events.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    try { data = { body: event.data?.text() }; } catch {}
  }

  // FCM data-only messages put everything in `data` field
  const fcmData = data.data || data;

  const title = fcmData.title || 'FOMO Chat';
  const body = fcmData.body || 'Новое сообщение';
  const isCall = fcmData.type === 'call';

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: fcmData,
    tag: isCall ? 'incoming-call' : (fcmData.conversationId || 'msg-' + Date.now()),
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall
      ? [500, 200, 500, 200, 500, 200, 500, 200, 500]  // Long vibration for calls
      : [300, 100, 300],  // Short vibration for messages
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const conversationId = data.conversationId;
  const url = conversationId ? `/?chat=${conversationId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── PWA caching ─────────────────────────────────────────────────
const CACHE_NAME = 'fomo-chat-v4';
const STATIC_ASSETS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.url.includes('/api/') || request.url.includes('/ws')) {
    return;
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (request.url.includes('/assets/') || request.url.endsWith('.png'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('/');
          return new Response('Offline', { status: 503 });
        })
      )
  );
});
