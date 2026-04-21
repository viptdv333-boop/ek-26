/**
 * Integration test for group E2EE flow (primitives only, no DB/network).
 *
 * Simulates a 3-person group: Alice, Bob, Carol.
 * Verifies that each can send to the group and all others decrypt correctly.
 *
 * Run: npx tsx shared/src/crypto/groupFlow.test.ts
 */
import {
  createSenderKey,
  getSenderKeyDistribution,
  processSenderKeyDistribution,
  serializeDistribution,
  deserializeDistribution,
  encryptSenderMessage,
  decryptSenderMessage,
  serializeSenderMessage,
  deserializeSenderMessage,
  SenderKeyState,
  SenderKeyReceiverState,
} from './senderKey';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { console.log(`  \u2713 ${msg}`); passed++; }
  else { console.error(`  \u2717 ${msg}`); failed++; }
}

function test(name: string, fn: () => void) {
  console.log(`\n\u2756 ${name}`);
  try { fn(); } catch (e: any) { console.error(`  \u2717 ${e.message}`); failed++; }
}

/**
 * Simulated participant in a group.
 */
class Participant {
  name: string;
  own: SenderKeyState;
  receivers: Map<string, SenderKeyReceiverState> = new Map();

  constructor(name: string) {
    this.name = name;
    this.own = createSenderKey();
  }

  /** Simulate distributing own key to another participant (via JSON serialization). */
  distributeTo(other: Participant) {
    const dist = getSenderKeyDistribution(this.own);
    const serialized = JSON.stringify(serializeDistribution(dist));
    // Receiver deserializes and processes
    const received = deserializeDistribution(JSON.parse(serialized));
    other.receivers.set(this.name, processSenderKeyDistribution(received));
  }

  /** Encrypt and return wire format. */
  send(plaintext: string, conversationId: string): string {
    const ad = new TextEncoder().encode(conversationId);
    const msg = encryptSenderMessage(this.own, new TextEncoder().encode(plaintext), ad);
    return JSON.stringify(serializeSenderMessage(msg));
  }

  /** Decrypt a message from another participant. */
  receive(senderName: string, wire: string, conversationId: string): string {
    const receiver = this.receivers.get(senderName);
    if (!receiver) throw new Error(`No receiver state for ${senderName}`);
    const msg = deserializeSenderMessage(JSON.parse(wire));
    const ad = new TextEncoder().encode(conversationId);
    const plain = decryptSenderMessage(receiver, msg, ad);
    return new TextDecoder().decode(plain);
  }
}

/* ───────── Tests ───────── */

test('3-person group: full round-trip with simulated distribution', () => {
  const convId = 'group-abc-123';
  const alice = new Participant('alice');
  const bob = new Participant('bob');
  const carol = new Participant('carol');

  // Initial distribution (simulates server + X3DH)
  alice.distributeTo(bob);
  alice.distributeTo(carol);
  bob.distributeTo(alice);
  bob.distributeTo(carol);
  carol.distributeTo(alice);
  carol.distributeTo(bob);

  // Alice sends a message to the group
  const aMsg = alice.send('Hi everyone!', convId);
  assert(bob.receive('alice', aMsg, convId) === 'Hi everyone!', 'Bob reads Alice');
  assert(carol.receive('alice', aMsg, convId) === 'Hi everyone!', 'Carol reads Alice');

  // Bob replies
  const bMsg = bob.send('Hey Alice', convId);
  assert(alice.receive('bob', bMsg, convId) === 'Hey Alice', 'Alice reads Bob');
  assert(carol.receive('bob', bMsg, convId) === 'Hey Alice', 'Carol reads Bob');

  // Carol sends
  const cMsg = carol.send('Third wheel here', convId);
  assert(alice.receive('carol', cMsg, convId) === 'Third wheel here', 'Alice reads Carol');
  assert(bob.receive('carol', cMsg, convId) === 'Third wheel here', 'Bob reads Carol');
});

test('out-of-order across 3-person group', () => {
  const convId = 'group-xyz';
  const alice = new Participant('alice');
  const bob = new Participant('bob');

  alice.distributeTo(bob);

  // Alice sends 5 messages
  const msgs = [];
  for (let i = 1; i <= 5; i++) {
    msgs.push(alice.send(`msg-${i}`, convId));
  }

  // Bob receives them in order: 5, 1, 3, 2, 4
  const order = [4, 0, 2, 1, 3]; // indices into msgs
  const expected = ['msg-5', 'msg-1', 'msg-3', 'msg-2', 'msg-4'];

  for (let i = 0; i < order.length; i++) {
    const got = bob.receive('alice', msgs[order[i]], convId);
    assert(got === expected[i], `${expected[i]} received out of order`);
  }
});

test('key rotation: Alice generates new key, old messages still decrypt', () => {
  const convId = 'rotate-test';
  const alice = new Participant('alice');
  const bob = new Participant('bob');

  alice.distributeTo(bob);

  // Alice sends under old key
  const oldMsg = alice.send('before rotation', convId);

  // Alice rotates (new key replaces old)
  const oldReceiverForBob = bob.receivers.get('alice'); // save for later
  alice.own = createSenderKey();
  alice.distributeTo(bob); // Bob gets new receiver state

  // Bob can read old message (using the old receiver state we saved)
  const ad = new TextEncoder().encode(convId);
  const oldWire = JSON.parse(oldMsg);
  const oldParsed = deserializeSenderMessage(oldWire);
  const oldPlain = decryptSenderMessage(oldReceiverForBob!, oldParsed, ad);
  assert(new TextDecoder().decode(oldPlain) === 'before rotation', 'Old message decrypts with old receiver state');

  // New message uses new key
  const newMsg = alice.send('after rotation', convId);
  assert(bob.receive('alice', newMsg, convId) === 'after rotation', 'New message decrypts with new receiver state');
});

test('impostor rejected: Alice and Eve both claim to be the same user', () => {
  const convId = 'impostor-test';
  const alice = new Participant('alice');
  const bob = new Participant('bob');
  const eve = new Participant('eve');

  alice.distributeTo(bob); // Bob has Alice's real key

  // Alice sends legitimate message
  const aliceMsg = alice.send('real alice', convId);
  assert(bob.receive('alice', aliceMsg, convId) === 'real alice', 'Real Alice works');

  // Eve tries to impersonate Alice: sends her own message but claims it's from 'alice'
  const eveMsg = eve.send('fake message from eve', convId);
  let threw = false;
  try {
    bob.receive('alice', eveMsg, convId); // Bob uses Alice's receiver state — but Eve signed with her own key
  } catch (e: any) {
    threw = e.message.toLowerCase().includes('invalid signature');
  }
  assert(threw, 'Eve cannot forge messages as Alice (signature mismatch)');
});

console.log(`\n═══════════════════════════════════`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`═══════════════════════════════════\n`);

if (failed > 0) process.exit(1);
