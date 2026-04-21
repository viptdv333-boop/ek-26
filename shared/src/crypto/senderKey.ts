/**
 * Sender Keys Protocol for Group E2EE
 *
 * Based on Signal Protocol's Sender Keys for efficient group messaging.
 *
 * Each group member has their own "sender key" chain:
 * - chainKey — secret 32-byte seed, ratcheted forward per message (HMAC)
 * - signingKey — Ed25519 pair for authenticating messages
 *
 * Sending flow:
 * 1. Get messageKey from chainKey via HKDF
 * 2. Ratchet chainKey forward (HMAC)
 * 3. Encrypt plaintext with AES-256-GCM using messageKey
 * 4. Sign ciphertext with Ed25519 signingKey
 *
 * Receiving flow:
 * 1. Verify Ed25519 signature
 * 2. If messageNumber > our tracked number: ratchet forward, cache skipped keys
 * 3. Derive messageKey
 * 4. Decrypt
 */
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { ed25519 } from '@noble/curves/ed25519';
import { hkdfExpand } from './hkdf';
import { aesEncrypt, aesDecrypt } from './aes';
import { randomBytes } from './random';
import { toBase64, fromBase64, concatBytes } from './encoding';

const CHAIN_KEY_LENGTH = 32;
const MESSAGE_KEY_LENGTH = 32;
const MAX_SKIP = 2000; // Max message keys to skip ahead (prevents DoS)

/** Own sender key state (used for sending) */
export interface SenderKeyState {
  chainKey: Uint8Array;              // Current chain key (ratchets forward)
  messageNumber: number;             // Next message number to send
  signingPrivateKey: Uint8Array;     // Ed25519 private key (32 bytes)
  signingPublicKey: Uint8Array;      // Ed25519 public key (32 bytes)
}

/** Receiver's view of another member's sender key */
export interface SenderKeyReceiverState {
  chainKey: Uint8Array;              // Current chain key for this sender
  expectedMessageNumber: number;     // Next expected message number
  signingPublicKey: Uint8Array;      // Sender's public signing key for verification
  skippedKeys: Map<number, Uint8Array>; // messageNumber -> messageKey for out-of-order
}

/** Bundle sent to group members — the initial sender key to distribute */
export interface SenderKeyDistribution {
  chainKey: Uint8Array;              // Initial chain key (32 bytes)
  messageNumber: number;             // Starting message number (usually 0)
  signingPublicKey: Uint8Array;      // Ed25519 public key for verification
}

/** Encrypted sender message (what gets sent on the wire) */
export interface SenderMessage {
  messageNumber: number;             // For ratchet sync
  ciphertext: Uint8Array;            // IV || encrypted || tag
  signature: Uint8Array;             // Ed25519 signature of ciphertext
}

/* ═════════════════════════════════════════════════════════════════
   Key generation
   ═════════════════════════════════════════════════════════════════ */

/**
 * Create a fresh sender key state for a new group member.
 * Call this when joining/creating a group.
 */
export function createSenderKey(): SenderKeyState {
  const chainKey = randomBytes(CHAIN_KEY_LENGTH);
  const signingPrivateKey = ed25519.utils.randomPrivateKey();
  const signingPublicKey = ed25519.getPublicKey(signingPrivateKey);

  return {
    chainKey,
    messageNumber: 0,
    signingPrivateKey,
    signingPublicKey,
  };
}

/**
 * Extract distribution bundle from own sender key state.
 * Send this to group members (encrypted via X3DH).
 */
export function getSenderKeyDistribution(state: SenderKeyState): SenderKeyDistribution {
  return {
    chainKey: state.chainKey,           // Share current chain key
    messageNumber: state.messageNumber, // So receivers know where to start
    signingPublicKey: state.signingPublicKey,
  };
}

/**
 * Process incoming distribution bundle — create receiver state.
 */
export function processSenderKeyDistribution(
  distribution: SenderKeyDistribution
): SenderKeyReceiverState {
  return {
    chainKey: distribution.chainKey,
    expectedMessageNumber: distribution.messageNumber,
    signingPublicKey: distribution.signingPublicKey,
    skippedKeys: new Map(),
  };
}

/* ═════════════════════════════════════════════════════════════════
   Ratchet + Key derivation
   ═════════════════════════════════════════════════════════════════ */

/**
 * Ratchet chain key forward.
 * nextChainKey = HMAC(chainKey, 0x02)
 */
function ratchetChainKey(chainKey: Uint8Array): Uint8Array {
  return hmac(sha256, chainKey, new Uint8Array([0x02]));
}

/**
 * Derive message key from chain key.
 * messageKey = HKDF(chainKey, "EK26_SenderMsgKey", 32)
 */
function deriveMessageKey(chainKey: Uint8Array): Uint8Array {
  // First get a "message seed" via HMAC, then expand via HKDF
  const seed = hmac(sha256, chainKey, new Uint8Array([0x01]));
  const info = new TextEncoder().encode('EK26_SenderMsgKey');
  return hkdfExpand(seed, info, MESSAGE_KEY_LENGTH);
}

/* ═════════════════════════════════════════════════════════════════
   Encryption / Decryption
   ═════════════════════════════════════════════════════════════════ */

/**
 * Encrypt a group message as the sender.
 * Ratchets own chain key forward.
 *
 * @param state — sender's own state (will be mutated — chainKey and messageNumber updated)
 * @param plaintext — message bytes to encrypt
 * @param associatedData — optional additional data (e.g. groupId bytes)
 * @returns SenderMessage ready to send
 */
export function encryptSenderMessage(
  state: SenderKeyState,
  plaintext: Uint8Array,
  associatedData?: Uint8Array
): SenderMessage {
  const messageKey = deriveMessageKey(state.chainKey);
  const messageNumber = state.messageNumber;

  // Encrypt with AES-256-GCM
  const ciphertext = aesEncrypt(messageKey, plaintext, associatedData);

  // Sign ciphertext with Ed25519
  const signature = ed25519.sign(ciphertext, state.signingPrivateKey);

  // Ratchet forward
  state.chainKey = ratchetChainKey(state.chainKey);
  state.messageNumber = messageNumber + 1;

  return {
    messageNumber,
    ciphertext,
    signature,
  };
}

/**
 * Decrypt a group message from a specific sender.
 *
 * Handles:
 * - Signature verification (rejects forgeries)
 * - Out-of-order messages (uses skipped keys cache)
 * - Future messages (ratchets forward, stores skipped keys)
 *
 * @param state — receiver's view of this sender's chain (mutated)
 * @param message — received SenderMessage
 * @param associatedData — must match what sender used
 * @returns decrypted plaintext bytes
 * @throws if signature invalid, message too old, or skip too large
 */
export function decryptSenderMessage(
  state: SenderKeyReceiverState,
  message: SenderMessage,
  associatedData?: Uint8Array
): Uint8Array {
  // Verify signature first
  const validSig = ed25519.verify(message.signature, message.ciphertext, state.signingPublicKey);
  if (!validSig) {
    throw new Error('Invalid signature on sender message');
  }

  const targetN = message.messageNumber;

  // Case 1: out-of-order, we have the key cached
  if (targetN < state.expectedMessageNumber) {
    const cachedKey = state.skippedKeys.get(targetN);
    if (!cachedKey) {
      throw new Error(`Message too old or already decrypted: ${targetN}`);
    }
    state.skippedKeys.delete(targetN);
    return aesDecrypt(cachedKey, message.ciphertext, associatedData);
  }

  // Case 2: future message — need to ratchet forward, cache skipped keys
  if (targetN > state.expectedMessageNumber) {
    const skipCount = targetN - state.expectedMessageNumber;
    if (skipCount > MAX_SKIP) {
      throw new Error(`Too many messages skipped: ${skipCount}`);
    }

    // Store skipped keys for potential out-of-order messages
    let currentChain = state.chainKey;
    for (let n = state.expectedMessageNumber; n < targetN; n++) {
      const msgKey = deriveMessageKey(currentChain);
      state.skippedKeys.set(n, msgKey);
      currentChain = ratchetChainKey(currentChain);
    }
    state.chainKey = currentChain;
    state.expectedMessageNumber = targetN;
  }

  // Now: targetN === expectedMessageNumber — derive key and decrypt
  const messageKey = deriveMessageKey(state.chainKey);

  // Ratchet state forward
  state.chainKey = ratchetChainKey(state.chainKey);
  state.expectedMessageNumber = targetN + 1;

  return aesDecrypt(messageKey, message.ciphertext, associatedData);
}

/* ═════════════════════════════════════════════════════════════════
   Serialization (for IndexedDB storage and network transport)
   ═════════════════════════════════════════════════════════════════ */

/** Serialized form of SenderKeyState (JSON-safe) */
export interface SerializedSenderKeyState {
  chainKey: string;
  messageNumber: number;
  signingPrivateKey: string;
  signingPublicKey: string;
}

export function serializeSenderKeyState(state: SenderKeyState): SerializedSenderKeyState {
  return {
    chainKey: toBase64(state.chainKey),
    messageNumber: state.messageNumber,
    signingPrivateKey: toBase64(state.signingPrivateKey),
    signingPublicKey: toBase64(state.signingPublicKey),
  };
}

export function deserializeSenderKeyState(ser: SerializedSenderKeyState): SenderKeyState {
  return {
    chainKey: fromBase64(ser.chainKey),
    messageNumber: ser.messageNumber,
    signingPrivateKey: fromBase64(ser.signingPrivateKey),
    signingPublicKey: fromBase64(ser.signingPublicKey),
  };
}

/** Serialized receiver state */
export interface SerializedSenderKeyReceiverState {
  chainKey: string;
  expectedMessageNumber: number;
  signingPublicKey: string;
  skippedKeys: Array<[number, string]>; // [messageNumber, base64 key]
}

export function serializeReceiverState(state: SenderKeyReceiverState): SerializedSenderKeyReceiverState {
  return {
    chainKey: toBase64(state.chainKey),
    expectedMessageNumber: state.expectedMessageNumber,
    signingPublicKey: toBase64(state.signingPublicKey),
    skippedKeys: Array.from(state.skippedKeys.entries()).map(([n, k]) => [n, toBase64(k)]),
  };
}

export function deserializeReceiverState(ser: SerializedSenderKeyReceiverState): SenderKeyReceiverState {
  return {
    chainKey: fromBase64(ser.chainKey),
    expectedMessageNumber: ser.expectedMessageNumber,
    signingPublicKey: fromBase64(ser.signingPublicKey),
    skippedKeys: new Map(ser.skippedKeys.map(([n, k]) => [n, fromBase64(k)])),
  };
}

/** Serialize/deserialize distribution bundle (for network transport) */
export interface SerializedDistribution {
  chainKey: string;
  messageNumber: number;
  signingPublicKey: string;
}

export function serializeDistribution(d: SenderKeyDistribution): SerializedDistribution {
  return {
    chainKey: toBase64(d.chainKey),
    messageNumber: d.messageNumber,
    signingPublicKey: toBase64(d.signingPublicKey),
  };
}

export function deserializeDistribution(s: SerializedDistribution): SenderKeyDistribution {
  return {
    chainKey: fromBase64(s.chainKey),
    messageNumber: s.messageNumber,
    signingPublicKey: fromBase64(s.signingPublicKey),
  };
}

/** Serialize/deserialize an encrypted sender message */
export interface SerializedSenderMessage {
  n: number;        // messageNumber
  c: string;        // ciphertext (base64)
  s: string;        // signature (base64)
}

export function serializeSenderMessage(msg: SenderMessage): SerializedSenderMessage {
  return {
    n: msg.messageNumber,
    c: toBase64(msg.ciphertext),
    s: toBase64(msg.signature),
  };
}

export function deserializeSenderMessage(ser: SerializedSenderMessage): SenderMessage {
  return {
    messageNumber: ser.n,
    ciphertext: fromBase64(ser.c),
    signature: fromBase64(ser.s),
  };
}
