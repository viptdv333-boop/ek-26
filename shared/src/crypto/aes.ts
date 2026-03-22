/**
 * AES-256-GCM encryption/decryption for message payloads.
 *
 * Each message gets a unique IV (12 bytes, randomly generated).
 * Authentication tag is appended to ciphertext (16 bytes).
 *
 * Uses @noble/ciphers for browser compatibility.
 */
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from './random';
import { toBase64, fromBase64, concatBytes } from './encoding';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns: IV (12) || ciphertext || tag (16)
 */
export function aesEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  associatedData?: Uint8Array
): Uint8Array {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`AES key must be ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  const iv = randomBytes(IV_LENGTH);

  // @noble/ciphers gcm returns ciphertext || tag concatenated
  const aes = gcm(key, iv, associatedData);
  const ciphertextWithTag = aes.encrypt(plaintext);

  // Prepend IV: IV || ciphertext || tag
  return concatBytes(iv, ciphertextWithTag);
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Input format: IV (12) || ciphertext || tag (16)
 */
export function aesDecrypt(
  key: Uint8Array,
  data: Uint8Array,
  associatedData?: Uint8Array
): Uint8Array {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`AES key must be ${KEY_LENGTH} bytes, got ${key.length}`);
  }
  if (data.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Ciphertext too short');
  }

  const iv = data.slice(0, IV_LENGTH);
  const ciphertextWithTag = data.slice(IV_LENGTH);

  const aes = gcm(key, iv, associatedData);
  return aes.decrypt(ciphertextWithTag);
}

/**
 * Encrypt a UTF-8 string, return base64 encoded result.
 */
export function encryptString(key: Uint8Array, plaintext: string, ad?: Uint8Array): string {
  const data = new TextEncoder().encode(plaintext);
  const encrypted = aesEncrypt(key, data, ad);
  return toBase64(encrypted);
}

/**
 * Decrypt a base64 encoded ciphertext to UTF-8 string.
 */
export function decryptString(key: Uint8Array, ciphertext: string, ad?: Uint8Array): string {
  const data = fromBase64(ciphertext);
  const decrypted = aesDecrypt(key, data, ad);
  return new TextDecoder().decode(decrypted);
}
