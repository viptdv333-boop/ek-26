/**
 * Encrypted Message Envelope
 *
 * Defines the wire format for encrypted messages sent between clients.
 * This format is transport-agnostic — used over WebSocket, Push, RSS, and Mesh.
 */
import { keyToBase64, base64ToKey } from './keys';
import { MessageHeader, EncryptedMessage } from './doubleRatchet';

/** Protocol version */
export const ENVELOPE_VERSION = 1;

/**
 * Initial message envelope (first message in a conversation).
 * Contains X3DH parameters so the recipient can establish the session.
 */
export interface InitialEnvelope {
  version: number;
  type: 'initial';
  senderIdentityKey: string;     // base64 — Alice's identity public key
  ephemeralKey: string;           // base64 — Alice's ephemeral public key from X3DH
  usedOneTimePreKeyId?: number;  // Which one-time pre-key was consumed
  usedSignedPreKeyId: number;    // Which signed pre-key was used
  message: SerializedEncryptedMessage;
}

/**
 * Regular message envelope (after session established).
 */
export interface RegularEnvelope {
  version: number;
  type: 'message';
  message: SerializedEncryptedMessage;
}

export type Envelope = InitialEnvelope | RegularEnvelope;

/** Serialized format for wire transfer */
export interface SerializedEncryptedMessage {
  dhKey: string;           // base64 — sender's current ratchet DH public key
  pn: number;              // previous chain length
  n: number;               // message number
  ct: string;              // base64 — ciphertext (IV || encrypted || tag)
}

/**
 * Serialize an EncryptedMessage for wire transfer.
 */
export function serializeMessage(msg: EncryptedMessage): SerializedEncryptedMessage {
  return {
    dhKey: keyToBase64(msg.header.dhPublicKey),
    pn: msg.header.previousChainLength,
    n: msg.header.messageNumber,
    ct: Buffer.from(msg.ciphertext).toString('base64'),
  };
}

/**
 * Deserialize a wire message back to EncryptedMessage.
 */
export function deserializeMessage(data: SerializedEncryptedMessage): EncryptedMessage {
  return {
    header: {
      dhPublicKey: base64ToKey(data.dhKey),
      previousChainLength: data.pn,
      messageNumber: data.n,
    },
    ciphertext: new Uint8Array(Buffer.from(data.ct, 'base64')),
  };
}

/**
 * Create an initial envelope (first message to a new contact).
 */
export function createInitialEnvelope(
  senderIdentityPublicKey: Uint8Array,
  ephemeralPublicKey: Uint8Array,
  usedSignedPreKeyId: number,
  usedOneTimePreKeyId: number | undefined,
  encryptedMessage: EncryptedMessage
): InitialEnvelope {
  return {
    version: ENVELOPE_VERSION,
    type: 'initial',
    senderIdentityKey: keyToBase64(senderIdentityPublicKey),
    ephemeralKey: keyToBase64(ephemeralPublicKey),
    usedSignedPreKeyId,
    usedOneTimePreKeyId,
    message: serializeMessage(encryptedMessage),
  };
}

/**
 * Create a regular envelope (ongoing conversation).
 */
export function createRegularEnvelope(
  encryptedMessage: EncryptedMessage
): RegularEnvelope {
  return {
    version: ENVELOPE_VERSION,
    type: 'message',
    message: serializeMessage(encryptedMessage),
  };
}

/**
 * Encode envelope to JSON string for transport.
 */
export function encodeEnvelope(envelope: Envelope): string {
  return JSON.stringify(envelope);
}

/**
 * Decode JSON string to envelope.
 */
export function decodeEnvelope(data: string): Envelope {
  const parsed = JSON.parse(data);
  if (parsed.version !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported envelope version: ${parsed.version}`);
  }
  return parsed as Envelope;
}
