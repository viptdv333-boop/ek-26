/**
 * Double Ratchet Algorithm
 *
 * Provides forward secrecy and break-in recovery for message encryption.
 * Each message uses a unique key derived from a ratcheting chain.
 *
 * Two ratchets:
 * 1. DH Ratchet — updates root key using new DH exchange (per round-trip)
 * 2. Symmetric Ratchet — derives message keys from chain key (per message)
 *
 * Based on the Signal Protocol Double Ratchet specification.
 */
import { generateKeyPair, dh, KeyPair } from './keys';
import { kdfRootKey, kdfChainKey } from './hkdf';
import { aesEncrypt, aesDecrypt } from './aes';
import { toBase64, fromBase64, toHex } from './encoding';

const MAX_SKIP = 1000; // Max skipped message keys to store

/** Header sent with each encrypted message */
export interface MessageHeader {
  dhPublicKey: Uint8Array;  // Sender's current ratchet public key (32 bytes)
  previousChainLength: number; // Number of messages in previous sending chain
  messageNumber: number;    // Message number in current sending chain
}

/** Encrypted message envelope */
export interface EncryptedMessage {
  header: MessageHeader;
  ciphertext: Uint8Array;   // AES-256-GCM encrypted: IV || ciphertext || tag
}

/** Serializable ratchet session state */
export interface RatchetState {
  // DH ratchet
  dhSendingKey: KeyPair;         // Our current DH ratchet key pair
  dhReceivingKey: Uint8Array | null; // Their current DH ratchet public key
  rootKey: Uint8Array;           // Current root key (32 bytes)

  // Sending chain
  sendingChainKey: Uint8Array | null;
  sendingMessageNumber: number;

  // Receiving chain
  receivingChainKey: Uint8Array | null;
  receivingMessageNumber: number;

  // Previous chain length (for header)
  previousSendingChainLength: number;

  // Skipped message keys: Map<"dhPubKey:messageNumber", messageKey>
  skippedKeys: Map<string, Uint8Array>;
}

/**
 * Initialize ratchet as the initiator (Alice).
 * Called after X3DH produces a shared secret.
 *
 * Alice knows Bob's signed pre-key (used as his initial DH ratchet key).
 */
export function ratchetInitAlice(
  sharedSecret: Uint8Array,
  bobDhPublicKey: Uint8Array
): RatchetState {
  const dhSendingKey = generateKeyPair();
  const dhOutput = dh(dhSendingKey.privateKey, bobDhPublicKey);
  const [rootKey, sendingChainKey] = kdfRootKey(sharedSecret, dhOutput);

  return {
    dhSendingKey,
    dhReceivingKey: bobDhPublicKey,
    rootKey,
    sendingChainKey,
    sendingMessageNumber: 0,
    receivingChainKey: null,
    receivingMessageNumber: 0,
    previousSendingChainLength: 0,
    skippedKeys: new Map(),
  };
}

/**
 * Initialize ratchet as the responder (Bob).
 * Called after X3DH produces a shared secret.
 *
 * Bob uses his signed pre-key as the initial DH ratchet key.
 */
export function ratchetInitBob(
  sharedSecret: Uint8Array,
  bobSignedPreKey: KeyPair
): RatchetState {
  return {
    dhSendingKey: bobSignedPreKey,
    dhReceivingKey: null,
    rootKey: sharedSecret,
    sendingChainKey: null,
    sendingMessageNumber: 0,
    receivingChainKey: null,
    receivingMessageNumber: 0,
    previousSendingChainLength: 0,
    skippedKeys: new Map(),
  };
}

/**
 * Encrypt a plaintext message using the Double Ratchet.
 */
export function ratchetEncrypt(
  state: RatchetState,
  plaintext: Uint8Array,
  associatedData: Uint8Array
): EncryptedMessage {
  if (!state.sendingChainKey) {
    throw new Error('Sending chain not initialized — waiting for first incoming message');
  }

  // Derive message key from sending chain
  const [nextChainKey, messageKey] = kdfChainKey(state.sendingChainKey);
  state.sendingChainKey = nextChainKey;

  const header: MessageHeader = {
    dhPublicKey: state.dhSendingKey.publicKey,
    previousChainLength: state.previousSendingChainLength,
    messageNumber: state.sendingMessageNumber,
  };

  state.sendingMessageNumber++;

  // Build AD: associatedData || serialized header
  const headerBytes = serializeHeader(header);
  const fullAD = concatBytes(associatedData, headerBytes);

  const ciphertext = aesEncrypt(messageKey, plaintext, fullAD);

  return { header, ciphertext };
}

/**
 * Decrypt a received encrypted message using the Double Ratchet.
 */
export function ratchetDecrypt(
  state: RatchetState,
  message: EncryptedMessage,
  associatedData: Uint8Array
): Uint8Array {
  const { header, ciphertext } = message;
  const headerBytes = serializeHeader(header);
  const fullAD = concatBytes(associatedData, headerBytes);

  // Try skipped message keys first
  const skipKey = makeSkipKey(header.dhPublicKey, header.messageNumber);
  const skippedMK = state.skippedKeys.get(skipKey);
  if (skippedMK) {
    state.skippedKeys.delete(skipKey);
    return aesDecrypt(skippedMK, ciphertext, fullAD);
  }

  // Check if we need a DH ratchet step
  if (!state.dhReceivingKey || !keysEqual(header.dhPublicKey, state.dhReceivingKey)) {
    // Skip any remaining messages in the current receiving chain
    if (state.receivingChainKey) {
      skipMessageKeys(state, state.dhReceivingKey!, header.previousChainLength);
    }

    // DH Ratchet step
    dhRatchetStep(state, header.dhPublicKey);
  }

  // Skip messages in the new receiving chain if needed
  skipMessageKeys(state, state.dhReceivingKey!, header.messageNumber);

  // Derive message key
  const [nextChainKey, messageKey] = kdfChainKey(state.receivingChainKey!);
  state.receivingChainKey = nextChainKey;
  state.receivingMessageNumber++;

  return aesDecrypt(messageKey, ciphertext, fullAD);
}

/**
 * Perform a DH ratchet step (when receiving a new DH key from the other party).
 */
function dhRatchetStep(state: RatchetState, newDhPublicKey: Uint8Array): void {
  state.previousSendingChainLength = state.sendingMessageNumber;
  state.sendingMessageNumber = 0;
  state.receivingMessageNumber = 0;
  state.dhReceivingKey = newDhPublicKey;

  // Receiving chain: DH with our current sending key and their new key
  const dhOutput1 = dh(state.dhSendingKey.privateKey, state.dhReceivingKey);
  const [rootKey1, receivingChainKey] = kdfRootKey(state.rootKey, dhOutput1);
  state.rootKey = rootKey1;
  state.receivingChainKey = receivingChainKey;

  // Generate new sending key pair
  state.dhSendingKey = generateKeyPair();

  // Sending chain: DH with our new sending key and their key
  const dhOutput2 = dh(state.dhSendingKey.privateKey, state.dhReceivingKey);
  const [rootKey2, sendingChainKey] = kdfRootKey(state.rootKey, dhOutput2);
  state.rootKey = rootKey2;
  state.sendingChainKey = sendingChainKey;
}

/**
 * Store skipped message keys for out-of-order message handling.
 */
function skipMessageKeys(
  state: RatchetState,
  dhPublicKey: Uint8Array,
  until: number
): void {
  if (!state.receivingChainKey) return;

  if (until - state.receivingMessageNumber > MAX_SKIP) {
    throw new Error('Too many skipped messages');
  }

  while (state.receivingMessageNumber < until) {
    const [nextChainKey, messageKey] = kdfChainKey(state.receivingChainKey);
    state.receivingChainKey = nextChainKey;
    const key = makeSkipKey(dhPublicKey, state.receivingMessageNumber);
    state.skippedKeys.set(key, messageKey);
    state.receivingMessageNumber++;
  }
}

/** Serialize header to bytes for use as associated data */
function serializeHeader(header: MessageHeader): Uint8Array {
  const buf = new Uint8Array(32 + 4 + 4);
  buf.set(header.dhPublicKey, 0);
  // previousChainLength as 4 bytes big-endian
  buf[32] = (header.previousChainLength >> 24) & 0xff;
  buf[33] = (header.previousChainLength >> 16) & 0xff;
  buf[34] = (header.previousChainLength >> 8) & 0xff;
  buf[35] = header.previousChainLength & 0xff;
  // messageNumber as 4 bytes big-endian
  buf[36] = (header.messageNumber >> 24) & 0xff;
  buf[37] = (header.messageNumber >> 16) & 0xff;
  buf[38] = (header.messageNumber >> 8) & 0xff;
  buf[39] = header.messageNumber & 0xff;
  return buf;
}

/** Create a key for the skippedKeys map */
function makeSkipKey(dhPublicKey: Uint8Array, messageNumber: number): string {
  return `${toHex(dhPublicKey)}:${messageNumber}`;
}

/** Constant-time key comparison */
function keysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** Concatenate Uint8Arrays */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Serialize RatchetState to JSON-safe object (for storage).
 */
export function serializeRatchetState(state: RatchetState): object {
  const toB64 = (b: Uint8Array | null) => b ? toBase64(b) : null;
  const skipped: Record<string, string> = {};
  for (const [k, v] of state.skippedKeys) {
    skipped[k] = toBase64(v);
  }
  return {
    dhSendingKey: {
      privateKey: toB64(state.dhSendingKey.privateKey),
      publicKey: toB64(state.dhSendingKey.publicKey),
    },
    dhReceivingKey: toB64(state.dhReceivingKey),
    rootKey: toB64(state.rootKey),
    sendingChainKey: toB64(state.sendingChainKey),
    sendingMessageNumber: state.sendingMessageNumber,
    receivingChainKey: toB64(state.receivingChainKey),
    receivingMessageNumber: state.receivingMessageNumber,
    previousSendingChainLength: state.previousSendingChainLength,
    skippedKeys: skipped,
  };
}

/**
 * Deserialize RatchetState from stored object.
 */
export function deserializeRatchetState(obj: any): RatchetState {
  const fromB64 = (s: string | null): Uint8Array | null =>
    s ? fromBase64(s) : null;

  const skipped = new Map<string, Uint8Array>();
  if (obj.skippedKeys) {
    for (const [k, v] of Object.entries(obj.skippedKeys)) {
      skipped.set(k, fromBase64(v as string));
    }
  }

  return {
    dhSendingKey: {
      privateKey: fromB64(obj.dhSendingKey.privateKey)!,
      publicKey: fromB64(obj.dhSendingKey.publicKey)!,
    },
    dhReceivingKey: fromB64(obj.dhReceivingKey),
    rootKey: fromB64(obj.rootKey)!,
    sendingChainKey: fromB64(obj.sendingChainKey),
    sendingMessageNumber: obj.sendingMessageNumber,
    receivingChainKey: fromB64(obj.receivingChainKey),
    receivingMessageNumber: obj.receivingMessageNumber,
    previousSendingChainLength: obj.previousSendingChainLength,
    skippedKeys: skipped,
  };
}
