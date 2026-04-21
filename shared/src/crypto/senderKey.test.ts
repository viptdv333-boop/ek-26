/**
 * Sender Keys Protocol — standalone test script.
 *
 * Run: npx tsx shared/src/crypto/senderKey.test.ts
 *
 * Tests covered:
 *   1. Sending and receiving a single message
 *   2. Multiple messages in order
 *   3. Out-of-order messages (skip ahead, then receive older)
 *   4. Invalid signature rejection
 *   5. Tampered ciphertext rejection
 *   6. Replay rejection
 *   7. Serialization round-trip
 */
import {
  createSenderKey,
  getSenderKeyDistribution,
  processSenderKeyDistribution,
  encryptSenderMessage,
  decryptSenderMessage,
  serializeSenderKeyState,
  deserializeSenderKeyState,
  serializeReceiverState,
  deserializeReceiverState,
  serializeDistribution,
  deserializeDistribution,
  serializeSenderMessage,
  deserializeSenderMessage,
} from './senderKey';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  \u2713 ${msg}`);
    passed++;
  } else {
    console.error(`  \u2717 ${msg}`);
    failed++;
  }
}

function test(name: string, fn: () => void) {
  console.log(`\n\u2756 ${name}`);
  try {
    fn();
  } catch (e: any) {
    console.error(`  \u2717 threw: ${e.message}`);
    failed++;
  }
}

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

/* ───────── Tests ───────── */

test('single message round-trip', () => {
  const aliceState = createSenderKey();
  const dist = getSenderKeyDistribution(aliceState);
  const bobReceiver = processSenderKeyDistribution(dist);

  const msg = encryptSenderMessage(aliceState, enc('Hello Bob!'));
  const plain = decryptSenderMessage(bobReceiver, msg);
  assert(dec(plain) === 'Hello Bob!', 'Bob decrypts Alice\'s first message');
});

test('multiple messages in order', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  const messages = ['one', 'two', 'three', 'four'];
  for (const text of messages) {
    const m = encryptSenderMessage(alice, enc(text));
    const plain = decryptSenderMessage(bob, m);
    assert(dec(plain) === text, `decrypts "${text}"`);
  }
  assert(bob.expectedMessageNumber === 4, 'expected message number is 4');
});

test('out-of-order messages', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  // Alice sends 3 messages
  const m1 = encryptSenderMessage(alice, enc('first'));
  const m2 = encryptSenderMessage(alice, enc('second'));
  const m3 = encryptSenderMessage(alice, enc('third'));

  // Bob receives them out of order: 3, 1, 2
  const p3 = decryptSenderMessage(bob, m3);
  assert(dec(p3) === 'third', 'Bob decrypts #3 first (skipping 1,2)');
  assert(bob.skippedKeys.size === 2, 'Bob stored 2 skipped keys');

  const p1 = decryptSenderMessage(bob, m1);
  assert(dec(p1) === 'first', 'Bob decrypts #1 from cache');

  const p2 = decryptSenderMessage(bob, m2);
  assert(dec(p2) === 'second', 'Bob decrypts #2 from cache');

  assert(bob.skippedKeys.size === 0, 'all skipped keys consumed');
});

test('invalid signature rejected', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  const msg = encryptSenderMessage(alice, enc('legitimate'));

  // Tamper with signature (flip a bit)
  const tampered = { ...msg, signature: new Uint8Array(msg.signature) };
  tampered.signature[0] ^= 0xff;

  let threw = false;
  try {
    decryptSenderMessage(bob, tampered);
  } catch (e: any) {
    threw = e.message.includes('Invalid signature');
  }
  assert(threw, 'decryption throws on invalid signature');
});

test('tampered ciphertext rejected', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  const msg = encryptSenderMessage(alice, enc('original'));
  const tampered = { ...msg, ciphertext: new Uint8Array(msg.ciphertext) };
  tampered.ciphertext[15] ^= 0xff;

  let threw = false;
  try {
    decryptSenderMessage(bob, tampered);
  } catch {
    threw = true;
  }
  assert(threw, 'decryption throws on tampered ciphertext (signature mismatch)');
});

test('replay rejected', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  const m1 = encryptSenderMessage(alice, enc('once'));
  decryptSenderMessage(bob, m1);

  // Replay the same message
  let threw = false;
  try {
    decryptSenderMessage(bob, m1);
  } catch (e: any) {
    threw = e.message.includes('too old') || e.message.includes('already');
  }
  assert(threw, 'replay of message #0 is rejected');
});

test('serialization round-trip: sender state', () => {
  const alice = createSenderKey();
  encryptSenderMessage(alice, enc('msg1'));
  encryptSenderMessage(alice, enc('msg2'));

  const ser = serializeSenderKeyState(alice);
  const restored = deserializeSenderKeyState(ser);

  assert(restored.messageNumber === 2, 'messageNumber preserved');
  assert(
    Buffer.from(restored.chainKey).toString('hex') === Buffer.from(alice.chainKey).toString('hex'),
    'chainKey preserved',
  );
  assert(
    Buffer.from(restored.signingPrivateKey).toString('hex') === Buffer.from(alice.signingPrivateKey).toString('hex'),
    'signingPrivateKey preserved',
  );
});

test('serialization round-trip: receiver state with skipped keys', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  const m1 = encryptSenderMessage(alice, enc('one'));
  encryptSenderMessage(alice, enc('two')); // m2 not needed for this test
  const m3 = encryptSenderMessage(alice, enc('three'));

  // Receive #3 first — stores skipped keys for 1,2
  decryptSenderMessage(bob, m3);

  const ser = serializeReceiverState(bob);
  const restored = deserializeReceiverState(ser);

  assert(restored.expectedMessageNumber === 3, 'expectedMessageNumber preserved');
  assert(restored.skippedKeys.size === 2, 'skipped keys preserved');

  // Use restored state to decrypt older messages
  const p1 = decryptSenderMessage(restored, m1);
  assert(dec(p1) === 'one', 'restored state decrypts #1 from cache');
});

test('serialization round-trip: distribution bundle', () => {
  const alice = createSenderKey();
  const dist = getSenderKeyDistribution(alice);

  const ser = serializeDistribution(dist);
  const restored = deserializeDistribution(ser);

  const bob = processSenderKeyDistribution(restored);
  const msg = encryptSenderMessage(alice, enc('cross-serialization'));
  const plain = decryptSenderMessage(bob, msg);
  assert(dec(plain) === 'cross-serialization', 'Bob from serialized distribution can decrypt');
});

test('serialization round-trip: sender message (wire format)', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  const msg = encryptSenderMessage(alice, enc('wire'));
  const wire = serializeSenderMessage(msg);

  // Simulate network: JSON stringify + parse
  const fromWire = deserializeSenderMessage(JSON.parse(JSON.stringify(wire)));

  const plain = decryptSenderMessage(bob, fromWire);
  assert(dec(plain) === 'wire', 'message survives JSON round-trip');
});

test('three-party group (Alice + Bob + Carol)', () => {
  const alice = createSenderKey();
  const bob = createSenderKey();
  const carol = createSenderKey();

  // Each participant builds receiver states for the other two
  const aliceFromBob = processSenderKeyDistribution(getSenderKeyDistribution(bob));
  const aliceFromCarol = processSenderKeyDistribution(getSenderKeyDistribution(carol));
  const bobFromAlice = processSenderKeyDistribution(getSenderKeyDistribution(alice));
  const bobFromCarol = processSenderKeyDistribution(getSenderKeyDistribution(carol));
  const carolFromAlice = processSenderKeyDistribution(getSenderKeyDistribution(alice));
  const carolFromBob = processSenderKeyDistribution(getSenderKeyDistribution(bob));

  // Alice broadcasts a message
  const aliceMsg = encryptSenderMessage(alice, enc('Hi from Alice'));
  assert(dec(decryptSenderMessage(bobFromAlice, aliceMsg)) === 'Hi from Alice', 'Bob reads Alice');
  assert(dec(decryptSenderMessage(carolFromAlice, aliceMsg)) === 'Hi from Alice', 'Carol reads Alice');

  // Bob broadcasts
  const bobMsg = encryptSenderMessage(bob, enc('Hi from Bob'));
  assert(dec(decryptSenderMessage(aliceFromBob, bobMsg)) === 'Hi from Bob', 'Alice reads Bob');
  assert(dec(decryptSenderMessage(carolFromBob, bobMsg)) === 'Hi from Bob', 'Carol reads Bob');

  // Carol broadcasts
  const carolMsg = encryptSenderMessage(carol, enc('Hi from Carol'));
  assert(dec(decryptSenderMessage(aliceFromCarol, carolMsg)) === 'Hi from Carol', 'Alice reads Carol');
  assert(dec(decryptSenderMessage(bobFromCarol, carolMsg)) === 'Hi from Carol', 'Bob reads Carol');
});

test('associated data mismatch fails', () => {
  const alice = createSenderKey();
  const bob = processSenderKeyDistribution(getSenderKeyDistribution(alice));

  const msg = encryptSenderMessage(alice, enc('payload'), enc('group-123'));

  let threw = false;
  try {
    decryptSenderMessage(bob, msg, enc('wrong-group-id'));
  } catch {
    threw = true;
  }
  assert(threw, 'decryption fails with mismatched associated data');
});

/* ───────── Summary ───────── */

console.log(`\n═══════════════════════════════════`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`═══════════════════════════════════\n`);

if (failed > 0) {
  process.exit(1);
}
