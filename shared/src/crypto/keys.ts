/**
 * X25519 Key Generation and Utilities
 *
 * Uses @noble/curves for X25519 ECDH key pairs.
 * All keys are 32 bytes (256 bits).
 */
import { x25519 } from '@noble/curves/ed25519';
import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from './random';

export interface KeyPair {
  privateKey: Uint8Array; // 32 bytes
  publicKey: Uint8Array;  // 32 bytes
}

export interface SignedPreKey {
  keyId: number;
  keyPair: KeyPair;
  signature: Uint8Array; // Ed25519 signature of the public key
  timestamp: number;
}

export interface OneTimePreKey {
  keyId: number;
  keyPair: KeyPair;
}

/** Generate an X25519 key pair */
export function generateKeyPair(): KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/** Generate an Ed25519 signing key pair (for identity key signatures) */
export function generateSigningKeyPair(): KeyPair {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/** Compute shared secret: X25519 DH(privateKey, publicKey) */
export function dh(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(privateKey, publicKey);
}

/** Sign a message with Ed25519 */
export function sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
  return ed25519.sign(message, privateKey);
}

/** Verify Ed25519 signature */
export function verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean {
  try {
    return ed25519.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

/** Generate a signed pre-key */
export function generateSignedPreKey(
  identitySigningKey: Uint8Array,
  keyId: number
): SignedPreKey {
  const keyPair = generateKeyPair();
  const signature = sign(identitySigningKey, keyPair.publicKey);
  return { keyId, keyPair, signature, timestamp: Date.now() };
}

/** Generate a batch of one-time pre-keys */
export function generateOneTimePreKeys(startId: number, count: number): OneTimePreKey[] {
  const keys: OneTimePreKey[] = [];
  for (let i = 0; i < count; i++) {
    keys.push({
      keyId: startId + i,
      keyPair: generateKeyPair(),
    });
  }
  return keys;
}

/** Encode key to base64 */
export function keyToBase64(key: Uint8Array): string {
  return Buffer.from(key).toString('base64');
}

/** Decode key from base64 */
export function base64ToKey(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** Compare two keys for equality (constant-time) */
export function keysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
