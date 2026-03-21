/**
 * HKDF (HMAC-based Key Derivation Function) — RFC 5869
 *
 * Used in X3DH and Double Ratchet for deriving keys from shared secrets.
 */
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

const HASH_LEN = 32; // SHA-256 output length

/**
 * HKDF-Extract: Extract a pseudorandom key from input keying material.
 * PRK = HMAC-SHA256(salt, ikm)
 */
export function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Uint8Array {
  return hmac(sha256, salt, ikm);
}

/**
 * HKDF-Expand: Expand a pseudorandom key to the desired length.
 * OKM = T(1) || T(2) || ... || T(N)
 * where T(i) = HMAC-SHA256(PRK, T(i-1) || info || i)
 */
export function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  const n = Math.ceil(length / HASH_LEN);
  const okm = new Uint8Array(n * HASH_LEN);
  let prev = new Uint8Array(0);

  for (let i = 1; i <= n; i++) {
    const input = new Uint8Array(prev.length + info.length + 1);
    input.set(prev, 0);
    input.set(info, prev.length);
    input[prev.length + info.length] = i;
    prev = hmac(sha256, prk, input) as Uint8Array<ArrayBuffer>;
    okm.set(prev, (i - 1) * HASH_LEN);
  }

  return okm.slice(0, length);
}

/**
 * HKDF full: Extract then Expand.
 * Derives `length` bytes from input keying material.
 */
export function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Uint8Array {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

/**
 * Derive root key and chain key from DH output.
 * Used in Double Ratchet DH ratchet step.
 * Returns [newRootKey (32 bytes), newChainKey (32 bytes)]
 */
export function kdfRootKey(
  rootKey: Uint8Array,
  dhOutput: Uint8Array
): [Uint8Array, Uint8Array] {
  const info = new TextEncoder().encode('EK26_RatchetStep');
  const derived = hkdf(dhOutput, rootKey, info, 64);
  return [derived.slice(0, 32), derived.slice(32, 64)];
}

/**
 * Derive next chain key and message key from current chain key.
 * Used in Double Ratchet symmetric ratchet.
 * Returns [nextChainKey (32 bytes), messageKey (32 bytes)]
 */
export function kdfChainKey(chainKey: Uint8Array): [Uint8Array, Uint8Array] {
  const messageKey = hmac(sha256, chainKey, new Uint8Array([0x01]));
  const nextChainKey = hmac(sha256, chainKey, new Uint8Array([0x02]));
  return [nextChainKey, messageKey];
}
