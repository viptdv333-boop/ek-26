/**
 * MessageEncryptor — high-level E2EE message encryption/decryption.
 *
 * Orchestrates X3DH session establishment and Double Ratchet
 * encryption/decryption for all messages.
 */
import {
  x3dhInitiate,
  x3dhRespond,
  ratchetInitAlice,
  ratchetInitBob,
  ratchetEncrypt,
  ratchetDecrypt,
  createInitialEnvelope,
  createRegularEnvelope,
  decodeEnvelope,
  deserializeMessage,
  Envelope,
  InitialEnvelope,
  RegularEnvelope,
  base64ToKey,
  PreKeyBundle,
  keyToBase64,
} from '@ek-26/shared';
import { keyManager } from './KeyManager';
import { getSession, saveSession, hasSession } from './SessionStore';
import { apiCall } from '../api/client';

/**
 * Encrypt a message for a conversation.
 *
 * If no session exists, fetches the recipient's pre-key bundle,
 * performs X3DH, and creates an initial envelope.
 */
export async function encryptMessage(
  conversationId: string,
  recipientUserId: string,
  plaintext: string
): Promise<string> {
  const plaintextBytes = new TextEncoder().encode(plaintext);

  let session = getSession(conversationId);

  if (!session) {
    // No session — need X3DH to establish one
    return await encryptInitialMessage(conversationId, recipientUserId, plaintextBytes);
  }

  // Existing session — use Double Ratchet
  const identityKey = keyManager.getIdentityKey();
  const ad = new Uint8Array(64); // Would be Alice IK || Bob IK, stored in session
  // For simplicity, use conversation ID as AD
  const adBytes = new TextEncoder().encode(conversationId);

  const encrypted = ratchetEncrypt(session, plaintextBytes, adBytes);
  saveSession(conversationId, session);

  const envelope = createRegularEnvelope(encrypted);
  return JSON.stringify(envelope);
}

/**
 * Encrypt the first message to a new contact (X3DH + initial envelope).
 */
async function encryptInitialMessage(
  conversationId: string,
  recipientUserId: string,
  plaintext: Uint8Array
): Promise<string> {
  // Fetch recipient's pre-key bundle from server
  const bundleRaw = await apiCall<{
    identityKey: string;
    signingKey: string;
    signedPreKey: { keyId: number; publicKey: string; signature: string };
    oneTimePreKey: { keyId: number; publicKey: string } | null;
  }>(`/api/keys/bundle/${recipientUserId}`);

  const bundle: PreKeyBundle = {
    identityKey: base64ToKey(bundleRaw.identityKey),
    signingKey: base64ToKey(bundleRaw.signingKey),
    signedPreKey: {
      keyId: bundleRaw.signedPreKey.keyId,
      publicKey: base64ToKey(bundleRaw.signedPreKey.publicKey),
      signature: base64ToKey(bundleRaw.signedPreKey.signature),
    },
    oneTimePreKey: bundleRaw.oneTimePreKey
      ? {
          keyId: bundleRaw.oneTimePreKey.keyId,
          publicKey: base64ToKey(bundleRaw.oneTimePreKey.publicKey),
        }
      : undefined,
  };

  // Perform X3DH
  const aliceIdentityKey = keyManager.getIdentityKey();
  const x3dhResult = x3dhInitiate(aliceIdentityKey, bundle);

  // Initialize Double Ratchet as Alice
  // Bob's signed pre-key is used as his initial DH ratchet key
  const session = ratchetInitAlice(x3dhResult.sharedSecret, bundle.signedPreKey.publicKey);

  // Encrypt the first message
  const adBytes = new TextEncoder().encode(conversationId);
  const encrypted = ratchetEncrypt(session, plaintext, adBytes);

  // Save session
  saveSession(conversationId, session);

  // Create initial envelope with X3DH params
  const envelope = createInitialEnvelope(
    aliceIdentityKey.publicKey,
    x3dhResult.ephemeralPublicKey,
    bundleRaw.signedPreKey.keyId,
    x3dhResult.usedOneTimePreKeyId,
    encrypted
  );

  return JSON.stringify(envelope);
}

/**
 * Decrypt a received message.
 */
export async function decryptMessage(
  conversationId: string,
  senderUserId: string,
  envelopeJson: string
): Promise<string> {
  const envelope = decodeEnvelope(envelopeJson);

  if (envelope.type === 'initial') {
    return decryptInitialMessage(conversationId, envelope as InitialEnvelope);
  }

  return decryptRegularMessage(conversationId, envelope as RegularEnvelope);
}

/**
 * Decrypt an initial message (first message from a new contact).
 * Performs X3DH from Bob's side and establishes the session.
 */
function decryptInitialMessage(
  conversationId: string,
  envelope: InitialEnvelope
): string {
  const bobIdentityKey = keyManager.getIdentityKey();
  const bobSignedPreKey = keyManager.getSignedPreKey();

  // Get the one-time pre-key that was used (if any)
  let bobOneTimePreKey = null;
  if (envelope.usedOneTimePreKeyId !== undefined) {
    const otpKeyPair = keyManager.consumeOneTimePreKey(envelope.usedOneTimePreKeyId);
    if (otpKeyPair) {
      bobOneTimePreKey = otpKeyPair;
    }
  }

  // Perform X3DH from Bob's side
  const x3dhResult = x3dhRespond(
    bobIdentityKey,
    bobSignedPreKey.keyPair,
    bobOneTimePreKey,
    base64ToKey(envelope.senderIdentityKey),
    base64ToKey(envelope.ephemeralKey)
  );

  // Initialize Double Ratchet as Bob
  const session = ratchetInitBob(x3dhResult.sharedSecret, bobSignedPreKey.keyPair);

  // Decrypt the message
  const encryptedMsg = deserializeMessage(envelope.message);
  const adBytes = new TextEncoder().encode(conversationId);
  const plaintext = ratchetDecrypt(session, encryptedMsg, adBytes);

  // Save session
  saveSession(conversationId, session);

  return new TextDecoder().decode(plaintext);
}

/**
 * Decrypt a regular message (ongoing conversation).
 */
function decryptRegularMessage(
  conversationId: string,
  envelope: RegularEnvelope
): string {
  const session = getSession(conversationId);
  if (!session) {
    throw new Error('No session found for this conversation. Cannot decrypt.');
  }

  const encryptedMsg = deserializeMessage(envelope.message);
  const adBytes = new TextEncoder().encode(conversationId);
  const plaintext = ratchetDecrypt(session, encryptedMsg, adBytes);

  saveSession(conversationId, session);

  return new TextDecoder().decode(plaintext);
}
