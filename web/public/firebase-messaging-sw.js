importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCYcIFLm2y1tNZIn18TUUL5mrPJPh2kcgk",
  authDomain: "fomo-chat-665e9.firebaseapp.com",
  projectId: "fomo-chat-665e9",
  storageBucket: "fomo-chat-665e9.firebasestorage.app",
  messagingSenderId: "1041371304955",
  appId: "1:1041371304955:web:dd695c9b8fead067ad315e",
});

const messaging = firebase.messaging();

// ── Push notification handler ──────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'FOMO Chat';
  const body = data.body || 'Новое сообщение';

  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data,
    tag: data.conversationId || 'default',
    renotify: true,
    vibrate: [200, 100, 200],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const conversationId = event.notification.data?.conversationId;
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

// ── PWA caching (merged from sw.js) ───────────────────────────
const CACHE_NAME = 'fomo-chat-v2';
const STATIC_ASSETS = ['/', '/logo-fomo.png'];

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
