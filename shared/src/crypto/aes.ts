/**
 * AES-256-GCM encryption/decryption for message payloads.
 *
 * Each message gets a unique IV (12 bytes, randomly generated).
 * Authentication tag is appended to ciphertext (16 bytes).
 */
import { randomBytes } from './random';

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

  // Use Node.js crypto
  const crypto = require('crypto');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  if (associatedData) {
    cipher.setAAD(Buffer.from(associatedData));
  }

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // IV || ciphertext || tag
  const result = new Uint8Array(IV_LENGTH + encrypted.length + TAG_LENGTH);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), IV_LENGTH);
  result.set(new Uint8Array(tag), IV_LENGTH + encrypted.length);

  return result;
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
  const tag = data.slice(data.length - TAG_LENGTH);
  const ciphertext = data.slice(IV_LENGTH, data.length - TAG_LENGTH);

  const crypto = require('crypto');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(tag));

  if (associatedData) {
    decipher.setAAD(Buffer.from(associatedData));
  }

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext)),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}

/**
 * Encrypt a UTF-8 string, return base64 encoded result.
 */
export function encryptString(key: Uint8Array, plaintext: string, ad?: Uint8Array): string {
  const data = new TextEncoder().encode(plaintext);
  const encrypted = aesEncrypt(key, data, ad);
  return Buffer.from(encrypted).toString('base64');
}

/**
 * Decrypt a base64 encoded ciphertext to UTF-8 string.
 */
export function decryptString(key: Uint8Array, ciphertext: string, ad?: Uint8Array): string {
  const data = new Uint8Array(Buffer.from(ciphertext, 'base64'));
  const decrypted = aesDecrypt(key, data, ad);
  return new TextDecoder().decode(decrypted);
}
