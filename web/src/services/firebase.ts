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
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Firebase] Notification permission denied');
      return false;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return false;

    // Register the Firebase messaging service worker
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log('[Firebase] FCM token obtained');
      // Register token with server
      try {
        await usersApi.registerPushToken(token, 'fcm');
        console.log('[Firebase] Token registered with server');
      } catch (err) {
        console.error('[Firebase] Failed to register token:', err);
      }
    }

    return true;
  } catch (err) {
    console.error('[Firebase] Permission request failed:', err);
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
