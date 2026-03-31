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

/** Check if running inside Android WebView */
function isAndroidWebView(): boolean {
  return !!(window as any).FomoAndroid || /FomoAndroid/.test(navigator.userAgent);
}

/** Get native FCM token from Android JS bridge (with retry) */
async function getNativeToken(): Promise<string | null> {
  // Check injected token first
  const injected = (window as any).__FOMO_FCM_TOKEN__;
  if (injected) return injected;

  // Try JS bridge
  try {
    const bridge = (window as any).FomoAndroid;
    if (bridge?.getFcmToken) {
      const token = bridge.getFcmToken();
      if (token) return token;
    }
  } catch (e) {
    console.warn('[FCM] Bridge call failed:', e);
  }

  // Wait for injection event
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000);
    window.addEventListener('fomo-native', (e: any) => {
      if (e.detail?.type === 'fcm-token' && e.detail.token) {
        clearTimeout(timeout);
        resolve(e.detail.token);
      }
    }, { once: true });
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // On Android WebView — get token from native bridge
    if (isAndroidWebView()) {
      console.log('[FCM] Android WebView detected, getting native token...');
      const nativeToken = await getNativeToken();
      if (nativeToken) {
        console.log('[FCM] Native token:', nativeToken.slice(0, 20) + '...');
        await usersApi.registerPushToken(nativeToken, 'fcm');
        console.log('[FCM] Native token registered with server');
        localStorage.setItem('fcm_token', nativeToken);
        localStorage.setItem('fcm_platform', 'android');
        return true;
      }
      console.warn('[FCM] No native token available');
      return false;
    }

    // Browser flow — check Notification API
    if (!('Notification' in window)) {
      console.warn('[FCM] Notification API not available');
      return false;
    }

    console.log('[FCM] Current permission:', Notification.permission);

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
