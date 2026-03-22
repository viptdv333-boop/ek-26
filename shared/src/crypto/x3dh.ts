/**
 * X3DH (Extended Triple Diffie-Hellman) Key Agreement
 *
 * Establishes a shared secret between two parties (Alice and Bob) where:
 * - Alice is the initiator (wants to send first message)
 * - Bob is the responder (has published a pre-key bundle on the server)
 *
 * Based on the Signal Protocol X3DH specification.
 *
 * Key hierarchy:
 *   Identity Key (long-term) -> Signed Pre-Key (rotated) -> One-Time Pre-Keys (consumed)
 */
import { dh, verify, KeyPair, generateKeyPair } from './keys';
import { hkdf } from './hkdf';

/** Bob's pre-key bundle as fetched from the server */
export interface PreKeyBundle {
  identityKey: Uint8Array;       // Bob's X25519 identity public key
  signedPreKey: {
    keyId: number;
    publicKey: Uint8Array;       // Bob's signed pre-key public
    signature: Uint8Array;       // Ed25519 signature over signedPreKey.publicKey
  };
  oneTimePreKey?: {              // May be absent if supply exhausted
    keyId: number;
    publicKey: Uint8Array;
  };
  signingKey: Uint8Array;        // Bob's Ed25519 public key (for verifying signature)
}

/** Result of X3DH for the initiator (Alice) */
export interface X3DHInitResult {
  sharedSecret: Uint8Array;             // 32 bytes — input to Double Ratchet
  ephemeralPublicKey: Uint8Array;       // Alice's ephemeral public key (sent to Bob)
  usedOneTimePreKeyId?: number;         // Which one-time pre-key was consumed
  associatedData: Uint8Array;           // AD = Alice's identity key || Bob's identity key
}

/** Result of X3DH for the responder (Bob) */
export interface X3DHResponseResult {
  sharedSecret: Uint8Array;             // 32 bytes — same as Alice's
  associatedData: Uint8Array;
}

const X3DH_INFO = new TextEncoder().encode('EK26_X3DH');
const X3DH_SALT = new Uint8Array(32); // 32 zero bytes as per spec

/**
 * Alice initiates X3DH with Bob's pre-key bundle.
 *
 * Performs:
 *   DH1 = DH(Alice_IK, Bob_SPK)
 *   DH2 = DH(Alice_EK, Bob_IK)
 *   DH3 = DH(Alice_EK, Bob_SPK)
 *   DH4 = DH(Alice_EK, Bob_OPK)  [if available]
 *   SK  = HKDF(DH1 || DH2 || DH3 [|| DH4])
 */
export function x3dhInitiate(
  aliceIdentityKey: KeyPair,
  bundle: PreKeyBundle
): X3DHInitResult {
  // Verify signed pre-key signature
  const sigValid = verify(
    bundle.signingKey,
    bundle.signedPreKey.publicKey,
    bundle.signedPreKey.signature
  );
  if (!sigValid) {
    throw new Error('X3DH: Invalid signed pre-key signature');
  }

  // Generate ephemeral key pair
  const ephemeralKey: KeyPair = generateKeyPair();

  // Compute DH values
  const dh1 = dh(aliceIdentityKey.privateKey, bundle.signedPreKey.publicKey);
  const dh2 = dh(ephemeralKey.privateKey, bundle.identityKey);
  const dh3 = dh(ephemeralKey.privateKey, bundle.signedPreKey.publicKey);

  let dhConcat: Uint8Array;
  let usedOneTimePreKeyId: number | undefined;

  if (bundle.oneTimePreKey) {
    const dh4 = dh(ephemeralKey.privateKey, bundle.oneTimePreKey.publicKey);
    dhConcat = concatBytes(dh1, dh2, dh3, dh4);
    usedOneTimePreKeyId = bundle.oneTimePreKey.keyId;
  } else {
    dhConcat = concatBytes(dh1, dh2, dh3);
  }

  // Derive shared secret
  const sharedSecret = hkdf(dhConcat, X3DH_SALT, X3DH_INFO, 32);

  // Associated data for AEAD
  const associatedData = concatBytes(aliceIdentityKey.publicKey, bundle.identityKey);

  return {
    sharedSecret,
    ephemeralPublicKey: ephemeralKey.publicKey,
    usedOneTimePreKeyId,
    associatedData,
  };
}

/**
 * Bob responds to X3DH initial message.
 *
 * Bob performs the same DH calculations using his private keys
 * and Alice's public keys (sent in the initial message header).
 */
export function x3dhRespond(
  bobIdentityKey: KeyPair,
  bobSignedPreKey: KeyPair,
  bobOneTimePreKey: KeyPair | null,
  aliceIdentityPublicKey: Uint8Array,
  aliceEphemeralPublicKey: Uint8Array
): X3DHResponseResult {
  // Compute DH values (mirror of Alice's)
  const dh1 = dh(bobSignedPreKey.privateKey, aliceIdentityPublicKey);
  const dh2 = dh(bobIdentityKey.privateKey, aliceEphemeralPublicKey);
  const dh3 = dh(bobSignedPreKey.privateKey, aliceEphemeralPublicKey);

  let dhConcat: Uint8Array;

  if (bobOneTimePreKey) {
    const dh4 = dh(bobOneTimePreKey.privateKey, aliceEphemeralPublicKey);
    dhConcat = concatBytes(dh1, dh2, dh3, dh4);
  } else {
    dhConcat = concatBytes(dh1, dh2, dh3);
  }

  const sharedSecret = hkdf(dhConcat, X3DH_SALT, X3DH_INFO, 32);
  const associatedData = concatBytes(aliceIdentityPublicKey, bobIdentityKey.publicKey);

  return { sharedSecret, associatedData };
}

/** Concatenate multiple Uint8Arrays */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
