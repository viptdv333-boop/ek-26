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

messaging.onBackgroundMessage((payload) => {
  // Data-only messages — full control over notification
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
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
