/**
 * Cryptographically secure random bytes.
 * Works in both Node.js and React Native environments.
 */

let _randomBytes: (size: number) => Uint8Array;

// Try Node.js crypto first, fall back to getRandomValues
try {
  const nodeCrypto = require('crypto');
  _randomBytes = (size: number) => new Uint8Array(nodeCrypto.randomBytes(size));
} catch {
  _randomBytes = (size: number) => {
    const buf = new Uint8Array(size);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(buf);
    } else {
      throw new Error('No secure random source available');
    }
    return buf;
  };
}

export function randomBytes(size: number): Uint8Array {
  return _randomBytes(size);
}
