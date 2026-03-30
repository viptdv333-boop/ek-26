/**
 * Key lifecycle management.
 *
 * Generates identity keys, signed pre-keys, and one-time pre-keys.
 * Uploads public portions to the server. Replenishes OPKs when supply is low.
 */
import { generateKeyPair, generateSigningKeyPair, generateSignedPreKey, generateOneTimePreKeys, keyToBase64 } from '../../../../shared/src/crypto/keys';
import { KeyStore } from './KeyStore';
import { keysApi } from '../api/endpoints';

const INITIAL_OPK_COUNT = 100;
const OPK_REPLENISH_THRESHOLD = 20;
const OPK_REPLENISH_BATCH = 100;

export class KeyManager {
  constructor(private store: KeyStore) {}

  /**
   * Ensure keys are registered. If no identity exists locally,
   * generate all keys, store private parts, upload public parts.
   * If identity exists, check OPK count and replenish if needed.
   */
  async ensureKeysRegistered(): Promise<void> {
    await this.store.init();
    const existing = await this.store.getIdentity();

    if (!existing) {
      await this.generateAndUploadAll();
    } else {
      // Verify server actually has our keys (upload may have failed previously)
      try {
        const { hasSignedPreKey } = await keysApi.getCount();
        if (!hasSignedPreKey) {
          console.warn('E2EE: Server missing key bundle, re-uploading...');
          await this.reuploadBundle(existing);
        }
      } catch {
        // If getCount fails, try re-uploading anyway
        await this.reuploadBundle(existing).catch(() => {});
      }
      await this.replenishIfNeeded();
    }
  }

  /**
   * Check server OPK count and replenish if below threshold.
   */
  async replenishIfNeeded(): Promise<void> {
    const { oneTimePreKeyCount } = await keysApi.getCount();
    if (oneTimePreKeyCount < OPK_REPLENISH_THRESHOLD) {
      await this.generateAndUploadOPKs(OPK_REPLENISH_BATCH);
    }
  }

  private async generateAndUploadAll(): Promise<void> {
    // Generate identity key pair (X25519)
    const identityKeyPair = generateKeyPair();
    // Generate signing key pair (Ed25519)
    const signingKeyPair = generateSigningKeyPair();
    // Generate signed pre-key
    const signedPreKey = generateSignedPreKey(signingKeyPair.privateKey, 1);
    // Generate one-time pre-keys
    const oneTimePreKeys = generateOneTimePreKeys(1, INITIAL_OPK_COUNT);

    // Save private keys locally
    await this.store.saveIdentity({
      userId: 'self',
      identityKeyPair: {
        privateKey: keyToBase64(identityKeyPair.privateKey),
        publicKey: keyToBase64(identityKeyPair.publicKey),
      },
      signingKeyPair: {
        privateKey: keyToBase64(signingKeyPair.privateKey),
        publicKey: keyToBase64(signingKeyPair.publicKey),
      },
      signedPreKey: {
        keyId: signedPreKey.keyId,
        keyPair: {
          privateKey: keyToBase64(signedPreKey.keyPair.privateKey),
          publicKey: keyToBase64(signedPreKey.keyPair.publicKey),
        },
        signature: keyToBase64(signedPreKey.signature),
        timestamp: signedPreKey.timestamp,
      },
      nextPreKeyId: INITIAL_OPK_COUNT + 1,
    });

    // Save OPK private keys locally
    await this.store.saveOneTimePreKeys(
      oneTimePreKeys.map((opk) => ({
        keyId: opk.keyId,
        privateKey: keyToBase64(opk.keyPair.privateKey),
        publicKey: keyToBase64(opk.keyPair.publicKey),
      }))
    );

    // Upload public portions to server
    await keysApi.uploadBundle({
      identityKey: keyToBase64(identityKeyPair.publicKey),
      signingKey: keyToBase64(signingKeyPair.publicKey),
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: keyToBase64(signedPreKey.keyPair.publicKey),
        signature: keyToBase64(signedPreKey.signature),
      },
      oneTimePreKeys: oneTimePreKeys.map((opk) => ({
        keyId: opk.keyId,
        publicKey: keyToBase64(opk.keyPair.publicKey),
      })),
    });
  }

  private async reuploadBundle(identity: import('./KeyStore').IdentityRecord): Promise<void> {
    await keysApi.uploadBundle({
      identityKey: identity.identityKeyPair.publicKey,
      signingKey: identity.signingKeyPair.publicKey,
      signedPreKey: {
        keyId: identity.signedPreKey.keyId,
        publicKey: identity.signedPreKey.keyPair.publicKey,
        signature: identity.signedPreKey.signature,
      },
      oneTimePreKeys: [], // Will be replenished separately
    });
    console.log('E2EE: Key bundle re-uploaded to server');
  }

  private async generateAndUploadOPKs(count: number): Promise<void> {
    const identity = await this.store.getIdentity();
    if (!identity) throw new Error('No identity found — cannot replenish OPKs');

    const startId = identity.nextPreKeyId;
    const oneTimePreKeys = generateOneTimePreKeys(startId, count);

    // Update nextPreKeyId
    identity.nextPreKeyId = startId + count;
    await this.store.saveIdentity(identity);

    // Save private keys locally
    await this.store.saveOneTimePreKeys(
      oneTimePreKeys.map((opk) => ({
        keyId: opk.keyId,
        privateKey: keyToBase64(opk.keyPair.privateKey),
        publicKey: keyToBase64(opk.keyPair.publicKey),
      }))
    );

    // Upload public keys to server
    await keysApi.replenish(
      oneTimePreKeys.map((opk) => ({
        keyId: opk.keyId,
        publicKey: keyToBase64(opk.keyPair.publicKey),
      }))
    );
  }
}
