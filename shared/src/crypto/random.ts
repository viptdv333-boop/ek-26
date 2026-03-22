/**
 * Cryptographically secure random bytes.
 * Works in browsers (Web Crypto API) and Node.js 19+ (globalThis.crypto).
 * Falls back to Node.js require('crypto') for older Node.js versions.
 */

export function randomBytes(size: number): Uint8Array {
  const buf = new Uint8Array(size);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
    return buf;
  }
  // Node.js fallback for versions < 19
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto');
  return new Uint8Array(nodeCrypto.randomBytes(size));
}
