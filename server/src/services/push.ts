import admin from 'firebase-admin';
import { config } from '../config';
import { User } from '../models/User';
import fs from 'fs';

let initialized = false;

function ensureInit() {
  if (initialized) return true;

  try {
    let serviceAccount: any = null;

    // Try reading from file first (Docker volume mount)
    const filePaths = ['/app/firebase-sa.json', './firebase-sa.json', '../deploy/firebase-sa.json'];
    for (const p of filePaths) {
      if (fs.existsSync(p)) {
        serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
        console.log(`[Push] Loaded Firebase SA from file: ${p}`);
        break;
      }
    }

    // Fallback to env variable
    if (!serviceAccount && config.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT);
      console.log('[Push] Loaded Firebase SA from env');
    }

    if (!serviceAccount) {
      console.warn('[Push] No Firebase service account found — push disabled');
      return false;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log('[Push] Firebase Admin initialized');
    return true;
  } catch (err) {
    console.error('[Push] Firebase init failed:', err);
    return false;
  }
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  if (!ensureInit()) return;

  const user = await User.findById(userId).select('fcmTokens');
  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

  const tokens = user.fcmTokens as string[];

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      // Include notification field for reliable Android delivery
      notification: {
        title: payload.title,
        body: payload.body.slice(0, 200),
      },
      data: {
        title: payload.title,
        body: payload.body.slice(0, 200),
        ...(payload.data || {}),
      },
      android: {
        priority: 'high',
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        // Override browser notification to use our custom one
        notification: {
          title: payload.title,
          body: payload.body.slice(0, 200),
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: payload.data?.conversationId || 'default',
          renotify: true,
        },
      },
    });

    // Clean up stale tokens
    const staleTokens: string[] = [];
    response.responses.forEach((resp, i) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        staleTokens.push(tokens[i]);
      }
    });

    if (staleTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pullAll: { fcmTokens: staleTokens },
      });
      console.log(`[Push] Removed ${staleTokens.length} stale tokens for user ${userId}`);
    }

    const successCount = response.responses.filter(r => r.success).length;
    if (successCount > 0) {
      console.log(`[Push] Sent to ${successCount}/${tokens.length} devices for user ${userId}`);
    }
  } catch (err) {
    console.error('[Push] Send failed:', err);
  }
}
