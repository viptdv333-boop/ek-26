import { FastifyInstance } from 'fastify';
import { KeyBundle } from '../models/KeyBundle';
import { sendToUser } from '../ws/handler';
import mongoose from 'mongoose';

const LOW_PREKEY_THRESHOLD = 20;

export async function keyRoutes(app: FastifyInstance) {
  /**
   * Upload pre-key bundle (initial registration or rotation).
   * Client sends identity key, signing key, signed pre-key, and batch of one-time pre-keys.
   */
  app.post('/api/keys/bundle', { preHandler: [app.authenticate] }, async (request) => {
    const {
      identityKey,
      signingKey,
      signedPreKey,
      oneTimePreKeys,
    } = request.body as {
      identityKey: string;      // base64
      signingKey: string;       // base64
      signedPreKey: {
        keyId: number;
        publicKey: string;      // base64
        signature: string;      // base64
      };
      oneTimePreKeys: Array<{
        keyId: number;
        publicKey: string;      // base64
      }>;
    };

    const userId = new mongoose.Types.ObjectId(request.userId);

    await KeyBundle.findOneAndUpdate(
      { userId },
      {
        userId,
        identityKey: Buffer.from(identityKey, 'base64'),
        signingKey: Buffer.from(signingKey, 'base64'),
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: Buffer.from(signedPreKey.publicKey, 'base64'),
          signature: Buffer.from(signedPreKey.signature, 'base64'),
          createdAt: new Date(),
        },
        oneTimePreKeys: oneTimePreKeys.map((k) => ({
          keyId: k.keyId,
          publicKey: Buffer.from(k.publicKey, 'base64'),
        })),
      },
      { upsert: true, new: true }
    );

    return { success: true };
  });

  /**
   * Fetch a user's pre-key bundle to initiate E2EE session.
   * Atomically consumes one one-time pre-key.
   */
  app.get('/api/keys/bundle/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const bundle = await KeyBundle.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!bundle) {
      return reply.code(404).send({ error: 'No key bundle found for this user' });
    }

    // Atomically pop one one-time pre-key
    let oneTimePreKey: { keyId: number; publicKey: string } | null = null;

    if (bundle.oneTimePreKeys.length > 0) {
      const result = await KeyBundle.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId), 'oneTimePreKeys.0': { $exists: true } },
        { $pop: { oneTimePreKeys: -1 } }, // Remove first element
        { new: false } // Return document BEFORE update to get the consumed key
      );

      if (result && result.oneTimePreKeys.length > 0) {
        const consumed = result.oneTimePreKeys[0];
        oneTimePreKey = {
          keyId: consumed.keyId,
          publicKey: consumed.publicKey.toString('base64'),
        };
      }

      // Check if pre-keys are running low, notify the key owner via WebSocket
      const remaining = bundle.oneTimePreKeys.length - 1;
      if (remaining < LOW_PREKEY_THRESHOLD) {
        sendToUser(userId, 'keys:low', { remaining });
      }
    }

    return {
      identityKey: bundle.identityKey.toString('base64'),
      signingKey: bundle.signingKey.toString('base64'),
      signedPreKey: {
        keyId: bundle.signedPreKey.keyId,
        publicKey: bundle.signedPreKey.publicKey.toString('base64'),
        signature: bundle.signedPreKey.signature.toString('base64'),
      },
      oneTimePreKey,
    };
  });

  /**
   * Replenish one-time pre-keys.
   * Client uploads additional pre-keys when supply is low.
   */
  app.post('/api/keys/replenish', { preHandler: [app.authenticate] }, async (request) => {
    const { oneTimePreKeys } = request.body as {
      oneTimePreKeys: Array<{
        keyId: number;
        publicKey: string; // base64
      }>;
    };

    const userId = new mongoose.Types.ObjectId(request.userId);

    await KeyBundle.findOneAndUpdate(
      { userId },
      {
        $push: {
          oneTimePreKeys: {
            $each: oneTimePreKeys.map((k) => ({
              keyId: k.keyId,
              publicKey: Buffer.from(k.publicKey, 'base64'),
            })),
          },
        },
      }
    );

    return { success: true, added: oneTimePreKeys.length };
  });

  /**
   * Get current pre-key count (for client to decide if replenishment needed).
   */
  app.get('/api/keys/count', { preHandler: [app.authenticate] }, async (request) => {
    const bundle = await KeyBundle.findOne({
      userId: new mongoose.Types.ObjectId(request.userId),
    });
    return {
      oneTimePreKeyCount: bundle?.oneTimePreKeys.length || 0,
      hasSignedPreKey: !!bundle?.signedPreKey,
    };
  });
}
