import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { usersApi } from './api/endpoints';

const firebaseConfig = {
  apiKey: "AIzaSyCYcIFLm2y1tNZIn18TUUL5mrPJPh2kcgk",
  authDomain: "fomo-chat-665e9.firebaseapp.com",
  projectId: "fomo-chat-665e9",
  storageBucket: "fomo-chat-665e9.firebasestorage.app",
  messagingSenderId: "1041371304955",
  appId: "1:1041371304955:web:dd695c9b8fead067ad315e",
};

const VAPID_KEY = 'BJoRhJVb3qu9brzyTOSauhZooFo2jr796cqXok3fJyIFQq8k4GTEVJa6rRqWhUY9nCGVoa54hKuV963CWPHpNLI';

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) {
    console.warn('[Firebase] Messaging not supported in this browser');
    return null;
  }
  const app = initializeApp(firebaseConfig);
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Check if Notification API is available
    if (!('Notification' in window)) {
      console.warn('[FCM] Notification API not available');
      return false;
    }

    console.log('[FCM] Current permission:', Notification.permission);

    // If already granted, just get token
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
      console.log('[FCM] Permission after request:', permission);
    }

    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return false;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('[FCM] Messaging not supported');
      return false;
    }

    // Register the Firebase messaging service worker
    let swRegistration: ServiceWorkerRegistration;
    try {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[FCM] Service worker registered');
    } catch (swErr) {
      console.error('[FCM] Service worker registration failed:', swErr);
      return false;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log('[FCM] Token obtained:', token.slice(0, 20) + '...');
      // Register token with server
      try {
        await usersApi.registerPushToken(token, 'fcm');
        console.log('[FCM] Token registered with server');
        localStorage.setItem('fcm_token', token);
      } catch (err) {
        console.error('[FCM] Failed to register token with server:', err);
      }
    } else {
      console.warn('[FCM] No token returned');
    }

    return true;
  } catch (err) {
    console.error('[FCM] Error:', err);
    return false;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  getMessagingInstance().then((messaging) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('[Firebase] Foreground message:', payload);
      callback(payload);
    });
  });
}
