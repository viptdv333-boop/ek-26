/**
 * KeyManager — manages E2EE keys on the client device.
 *
 * Responsibilities:
 * - Generate identity key pair (once, at registration)
 * - Generate signed pre-key (rotated periodically)
 * - Generate batches of one-time pre-keys
 * - Upload public keys to server
 * - Store private keys securely in local storage
 * - Replenish one-time pre-keys when supply is low
 */
import {
  generateKeyPair,
  generateSigningKeyPair,
  generateSignedPreKey,
  generateOneTimePreKeys,
  keyToBase64,
  base64ToKey,
  KeyPair,
  SignedPreKey,
  OneTimePreKey,
} from '@ek-26/shared';
import { apiCall } from '../api/client';

const STORAGE_KEY_IDENTITY = 'ek26_identity_key';
const STORAGE_KEY_SIGNING = 'ek26_signing_key';
const STORAGE_KEY_SIGNED_PREKEY = 'ek26_signed_prekey';
const STORAGE_KEY_OTP_COUNTER = 'ek26_otp_key_counter';
const STORAGE_KEY_OTP_KEYS = 'ek26_otp_keys';
const PREKEY_BATCH_SIZE = 100;

// Simple in-memory storage for now (would use react-native-mmkv in production)
const storage = new Map<string, string>();

function storageGet(key: string): string | null {
  return storage.get(key) ?? null;
}
function storageSet(key: string, value: string): void {
  storage.set(key, value);
}

export class KeyManager {
  private identityKey: KeyPair | null = null;
  private signingKey: KeyPair | null = null;
  private signedPreKey: SignedPreKey | null = null;
  private oneTimePreKeys: Map<number, KeyPair> = new Map();
  private nextPreKeyId: number = 0;

  /** Initialize — load keys from storage or generate new ones */
  async init(): Promise<void> {
    const stored = storageGet(STORAGE_KEY_IDENTITY);
    if (stored) {
      this.loadFromStorage();
    } else {
      await this.generateAllKeys();
    }
  }

  /** Generate all keys for a new user and upload to server */
  async generateAllKeys(): Promise<void> {
    // Identity key (X25519, long-term)
    this.identityKey = generateKeyPair();

    // Signing key (Ed25519, for signing pre-keys)
    this.signingKey = generateSigningKeyPair();

    // Signed pre-key
    this.signedPreKey = generateSignedPreKey(this.signingKey.privateKey, 1);

    // One-time pre-keys
    this.nextPreKeyId = 1;
    const otpKeys = generateOneTimePreKeys(this.nextPreKeyId, PREKEY_BATCH_SIZE);
    this.nextPreKeyId += PREKEY_BATCH_SIZE;

    for (const key of otpKeys) {
      this.oneTimePreKeys.set(key.keyId, key.keyPair);
    }

    // Save to storage
    this.saveToStorage();

    // Upload public keys to server
    await this.uploadKeyBundle(otpKeys);
  }

  /** Upload key bundle to server */
  private async uploadKeyBundle(otpKeys: OneTimePreKey[]): Promise<void> {
    await apiCall('/api/keys/bundle', {
      method: 'POST',
      body: {
        identityKey: keyToBase64(this.identityKey!.publicKey),
        signingKey: keyToBase64(this.signingKey!.publicKey),
        signedPreKey: {
          keyId: this.signedPreKey!.keyId,
          publicKey: keyToBase64(this.signedPreKey!.keyPair.publicKey),
          signature: keyToBase64(this.signedPreKey!.signature),
        },
        oneTimePreKeys: otpKeys.map((k) => ({
          keyId: k.keyId,
          publicKey: keyToBase64(k.keyPair.publicKey),
        })),
      },
    });
  }

  /** Replenish one-time pre-keys when supply is low */
  async replenishPreKeys(): Promise<void> {
    const otpKeys = generateOneTimePreKeys(this.nextPreKeyId, PREKEY_BATCH_SIZE);
    this.nextPreKeyId += PREKEY_BATCH_SIZE;

    for (const key of otpKeys) {
      this.oneTimePreKeys.set(key.keyId, key.keyPair);
    }

    this.saveToStorage();

    await apiCall('/api/keys/replenish', {
      method: 'POST',
      body: {
        oneTimePreKeys: otpKeys.map((k) => ({
          keyId: k.keyId,
          publicKey: keyToBase64(k.keyPair.publicKey),
        })),
      },
    });
  }

  /** Get identity key pair */
  getIdentityKey(): KeyPair {
    if (!this.identityKey) throw new Error('Keys not initialized');
    return this.identityKey;
  }

  /** Get signing key pair */
  getSigningKey(): KeyPair {
    if (!this.signingKey) throw new Error('Keys not initialized');
    return this.signingKey;
  }

  /** Get signed pre-key */
  getSignedPreKey(): SignedPreKey {
    if (!this.signedPreKey) throw new Error('Keys not initialized');
    return this.signedPreKey;
  }

  /** Get and remove a one-time pre-key by ID (used when receiving initial message) */
  consumeOneTimePreKey(keyId: number): KeyPair | null {
    const key = this.oneTimePreKeys.get(keyId);
    if (key) {
      this.oneTimePreKeys.delete(keyId);
      this.saveToStorage();
      return key;
    }
    return null;
  }

  private saveToStorage(): void {
    const serializeKP = (kp: KeyPair) => ({
      priv: keyToBase64(kp.privateKey),
      pub: keyToBase64(kp.publicKey),
    });

    storageSet(STORAGE_KEY_IDENTITY, JSON.stringify(serializeKP(this.identityKey!)));
    storageSet(STORAGE_KEY_SIGNING, JSON.stringify(serializeKP(this.signingKey!)));
    storageSet(STORAGE_KEY_SIGNED_PREKEY, JSON.stringify({
      keyId: this.signedPreKey!.keyId,
      keyPair: serializeKP(this.signedPreKey!.keyPair),
      signature: keyToBase64(this.signedPreKey!.signature),
      timestamp: this.signedPreKey!.timestamp,
    }));
    storageSet(STORAGE_KEY_OTP_COUNTER, String(this.nextPreKeyId));

    const otpEntries: Array<[number, { priv: string; pub: string }]> = [];
    for (const [id, kp] of this.oneTimePreKeys) {
      otpEntries.push([id, serializeKP(kp)]);
    }
    storageSet(STORAGE_KEY_OTP_KEYS, JSON.stringify(otpEntries));
  }

  private loadFromStorage(): void {
    const deserializeKP = (obj: { priv: string; pub: string }): KeyPair => ({
      privateKey: base64ToKey(obj.priv),
      publicKey: base64ToKey(obj.pub),
    });

    const idRaw = JSON.parse(storageGet(STORAGE_KEY_IDENTITY)!);
    this.identityKey = deserializeKP(idRaw);

    const sigRaw = JSON.parse(storageGet(STORAGE_KEY_SIGNING)!);
    this.signingKey = deserializeKP(sigRaw);

    const spkRaw = JSON.parse(storageGet(STORAGE_KEY_SIGNED_PREKEY)!);
    this.signedPreKey = {
      keyId: spkRaw.keyId,
      keyPair: deserializeKP(spkRaw.keyPair),
      signature: base64ToKey(spkRaw.signature),
      timestamp: spkRaw.timestamp,
    };

    this.nextPreKeyId = Number(storageGet(STORAGE_KEY_OTP_COUNTER) || '0');

    const otpRaw = JSON.parse(storageGet(STORAGE_KEY_OTP_KEYS) || '[]');
    this.oneTimePreKeys = new Map();
    for (const [id, kpRaw] of otpRaw) {
      this.oneTimePreKeys.set(id, deserializeKP(kpRaw));
    }
  }
}

/** Singleton instance */
export const keyManager = new KeyManager();
