/**
 * Session management for E2EE messaging.
 *
 * Handles X3DH session establishment and Double Ratchet encrypt/decrypt.
 * Uses per-recipient mutex to prevent race conditions on ratchet state.
 */
import {
  x3dhInitiate,
  x3dhRespond,
  ratchetInitAlice,
  ratchetInitBob,
  ratchetEncrypt,
  ratchetDecrypt,
  serializeRatchetState,
  deserializeRatchetState,
  createInitialEnvelope,
  createRegularEnvelope,
  encodeEnvelope,
  decodeEnvelope,
  deserializeMessage,
  keyToBase64,
  base64ToKey,
} from '@ek-26/shared';
import type { PreKeyBundle, RatchetState, Envelope, InitialEnvelope } from '@ek-26/shared';
import { KeyStore } from './KeyStore';
import { keysApi } from '../api/endpoints';

export class SessionManager {
  private locks = new Map<string, Promise<void>>();

  constructor(private store: KeyStore) {}

  private async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(userId)) {
      await this.locks.get(userId);
    }
    let resolve!: () => void;
    this.locks.set(userId, new Promise<void>((r) => (resolve = r)));
    try {
      return await fn();
    } finally {
      this.locks.delete(userId);
      resolve();
    }
  }

  /**
   * Encrypt a plaintext message for a recipient.
   * Returns an encoded envelope string (JSON).
   *
   * If no session exists, performs X3DH and creates an InitialEnvelope.
   * If a session exists, uses the Double Ratchet and creates a RegularEnvelope.
   */
  async encryptMessage(recipientUserId: string, plaintext: string): Promise<string> {
    return this.withLock(recipientUserId, async () => {
      await this.store.init();
      const identity = await this.store.getIdentity();
      if (!identity) throw new Error('No identity keys — call KeyManager.ensureKeysRegistered() first');

      const session = await this.store.getSession(recipientUserId);
      const plaintextBytes = new TextEncoder().encode(plaintext);

      if (!session) {
        // No session: fetch bundle, X3DH, init ratchet as Alice
        return this.initiateSession(recipientUserId, identity, plaintextBytes);
      } else {
        // Existing session: encrypt with ratchet
        return this.encryptWithSession(recipientUserId, session.ratchetState, session.associatedData, plaintextBytes);
      }
    });
  }

  /**
   * Decrypt an incoming encrypted message.
   * Returns the decrypted plaintext string.
   */
  async decryptMessage(senderUserId: string, envelopeStr: string): Promise<string> {
    return this.withLock(senderUserId, async () => {
      await this.store.init();
      const envelope: Envelope = decodeEnvelope(envelopeStr);

      if (envelope.type === 'initial') {
        return this.handleInitialMessage(senderUserId, envelope);
      } else {
        return this.handleRegularMessage(senderUserId, envelope);
      }
    });
  }

  private async initiateSession(
    recipientUserId: string,
    identity: NonNullable<Awaited<ReturnType<KeyStore['getIdentity']>>>,
    plaintextBytes: Uint8Array
  ): Promise<string> {
    // Fetch recipient's pre-key bundle from server
    const rawBundle = await keysApi.fetchBundle(recipientUserId);

    const bundle: PreKeyBundle = {
      identityKey: base64ToKey(rawBundle.identityKey),
      signingKey: base64ToKey(rawBundle.signingKey),
      signedPreKey: {
        keyId: rawBundle.signedPreKey.keyId,
        publicKey: base64ToKey(rawBundle.signedPreKey.publicKey),
        signature: base64ToKey(rawBundle.signedPreKey.signature),
      },
      oneTimePreKey: rawBundle.oneTimePreKey
        ? {
            keyId: rawBundle.oneTimePreKey.keyId,
            publicKey: base64ToKey(rawBundle.oneTimePreKey.publicKey),
          }
        : undefined,
    };

    // X3DH as Alice
    const aliceIdentityKey = {
      privateKey: base64ToKey(identity.identityKeyPair.privateKey),
      publicKey: base64ToKey(identity.identityKeyPair.publicKey),
    };

    const x3dhResult = x3dhInitiate(aliceIdentityKey, bundle);

    // Init Double Ratchet as Alice
    const ratchetState: RatchetState = ratchetInitAlice(
      x3dhResult.sharedSecret,
      bundle.signedPreKey.publicKey
    );

    // Encrypt
    const encrypted = ratchetEncrypt(ratchetState, plaintextBytes, x3dhResult.associatedData);

    // Save session
    await this.store.saveSession(
      recipientUserId,
      serializeRatchetState(ratchetState),
      keyToBase64(x3dhResult.associatedData)
    );

    // Create InitialEnvelope
    const envelope = createInitialEnvelope(
      aliceIdentityKey.publicKey,
      x3dhResult.ephemeralPublicKey,
      bundle.signedPreKey.keyId,
      x3dhResult.usedOneTimePreKeyId,
      encrypted
    );

    return encodeEnvelope(envelope);
  }

  private async encryptWithSession(
    recipientUserId: string,
    serializedState: object,
    associatedDataB64: string,
    plaintextBytes: Uint8Array
  ): Promise<string> {
    const ratchetState = deserializeRatchetState(serializedState);
    const associatedData = base64ToKey(associatedDataB64);

    const encrypted = ratchetEncrypt(ratchetState, plaintextBytes, associatedData);

    // Save updated ratchet state
    await this.store.saveSession(
      recipientUserId,
      serializeRatchetState(ratchetState),
      associatedDataB64
    );

    const envelope = createRegularEnvelope(encrypted);
    return encodeEnvelope(envelope);
  }

  private async handleInitialMessage(senderUserId: string, envelope: InitialEnvelope): Promise<string> {
    const identity = await this.store.getIdentity();
    if (!identity) throw new Error('No identity keys — cannot decrypt initial message');

    const bobIdentityKey = {
      privateKey: base64ToKey(identity.identityKeyPair.privateKey),
      publicKey: base64ToKey(identity.identityKeyPair.publicKey),
    };

    const bobSignedPreKey = {
      privateKey: base64ToKey(identity.signedPreKey.keyPair.privateKey),
      publicKey: base64ToKey(identity.signedPreKey.keyPair.publicKey),
    };

    // Load and consume one-time pre-key if used
    let bobOneTimePreKey = null;
    if (envelope.usedOneTimePreKeyId != null) {
      const opk = await this.store.getOneTimePreKey(envelope.usedOneTimePreKeyId);
      if (opk) {
        bobOneTimePreKey = {
          privateKey: base64ToKey(opk.privateKey),
          publicKey: base64ToKey(opk.publicKey),
        };
        await this.store.deleteOneTimePreKey(envelope.usedOneTimePreKeyId);
      }
    }

    const aliceIdentityPublicKey = base64ToKey(envelope.senderIdentityKey);
    const aliceEphemeralPublicKey = base64ToKey(envelope.ephemeralKey);

    // X3DH as Bob
    const x3dhResult = x3dhRespond(
      bobIdentityKey,
      bobSignedPreKey,
      bobOneTimePreKey,
      aliceIdentityPublicKey,
      aliceEphemeralPublicKey
    );

    // Init Double Ratchet as Bob
    const ratchetState: RatchetState = ratchetInitBob(x3dhResult.sharedSecret, bobSignedPreKey);

    // Decrypt message
    const encryptedMessage = deserializeMessage(envelope.message);
    const plaintext = ratchetDecrypt(ratchetState, encryptedMessage, x3dhResult.associatedData);

    // Save session
    await this.store.saveSession(
      senderUserId,
      serializeRatchetState(ratchetState),
      keyToBase64(x3dhResult.associatedData)
    );

    return new TextDecoder().decode(plaintext);
  }

  private async handleRegularMessage(senderUserId: string, envelope: Envelope): Promise<string> {
    if (envelope.type !== 'message') throw new Error('Expected regular envelope');

    const session = await this.store.getSession(senderUserId);
    if (!session) throw new Error(`No session found for ${senderUserId} — cannot decrypt regular message`);

    const ratchetState = deserializeRatchetState(session.ratchetState);
    const associatedData = base64ToKey(session.associatedData);

    const encryptedMessage = deserializeMessage(envelope.message);
    const plaintext = ratchetDecrypt(ratchetState, encryptedMessage, associatedData);

    // Save updated ratchet state
    await this.store.saveSession(
      senderUserId,
      serializeRatchetState(ratchetState),
      session.associatedData
    );

    return new TextDecoder().decode(plaintext);
  }
}
