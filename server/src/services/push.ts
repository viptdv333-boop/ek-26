import admin from 'firebase-admin';
import { config } from '../config';
import { User } from '../models/User';

let initialized = false;

function ensureInit() {
  if (initialized) return true;
  if (!config.FIREBASE_SERVICE_ACCOUNT) return false;

  try {
    const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT);
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
      notification: {
        title: payload.title,
        body: payload.body.slice(0, 200),
      },
      data: payload.data || {},
      webpush: {
        fcmOptions: {
          link: '/',
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
