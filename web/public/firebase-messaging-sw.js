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

  if (isCall) {
    // Call notification with Accept/Decline actions + repeating vibration
    const callOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/logo-f.png',
      data: fcmData,
      tag: 'incoming-call',
      renotify: true,
      requireInteraction: true,
      vibrate: [800, 400, 800, 400, 800, 400],
      actions: [
        { action: 'accept', title: '🟢 Принять' },
        { action: 'decline', title: '🔴 Отклонить' },
      ],
      silent: false,
    };

    // Re-show notification every 3s to keep vibrating (Android ignores long patterns)
    const callId = fcmData.callId || '';
    self._activeCallId = callId;

    const keepVibrating = async () => {
      for (let i = 0; i < 10; i++) { // 30 seconds max
        if (self._activeCallId !== callId) break;
        await self.registration.showNotification('📞 ' + title, callOptions);
        await new Promise(r => setTimeout(r, 3000));
      }
    };

    event.waitUntil(keepVibrating());
  } else {
    // Regular message notification
    const options = {
      body,
      icon: '/icon-192.png',
      badge: '/logo-f.png',
      data: fcmData,
      tag: fcmData.conversationId || 'msg-' + Date.now(),
      renotify: true,
      vibrate: [300, 100, 300],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  const action = event.action;
  const isCall = data.type === 'call';

  event.notification.close();
  // Stop vibration loop
  self._activeCallId = null;

  if (isCall) {
    // Handle call notification actions
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        const appClient = windowClients.find((c) => c.url.includes(self.location.origin));

        if (action === 'accept') {
          // Tell the app to accept the call
          if (appClient) {
            appClient.postMessage({ type: 'call:accept', data });
            return appClient.focus();
          }
          // App not open — open it with call params
          return clients.openWindow('/?callAction=accept&callId=' + (data.callId || ''));
        } else if (action === 'decline') {
          // Tell the app to decline the call
          if (appClient) {
            appClient.postMessage({ type: 'call:decline', data });
          }
          return; // Don't open the app on decline
        } else {
          // Tapped notification body — open/focus app
          if (appClient) {
            appClient.postMessage({ type: 'call:accept', data });
            return appClient.focus();
          }
          return clients.openWindow('/?callAction=accept&callId=' + (data.callId || ''));
        }
      })
    );
  } else {
    // Regular message — open/focus app
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
  }
});

// ── PWA caching ─────────────────────────────────────────────────
const CACHE_NAME = 'fomo-chat-v8';
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
