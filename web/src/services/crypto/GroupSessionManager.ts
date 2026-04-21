/**
 * GroupSessionManager — high-level API for encrypted group messaging.
 *
 * Usage:
 *   // When sending a group message:
 *   const envelope = await groupSessionManager.encryptGroupMessage(convId, plaintext, memberIds);
 *   wsTransport.send('message:send', { conversationId, encryptedPayload: envelope, type: 'group_e2ee' });
 *
 *   // When receiving:
 *   const plaintext = await groupSessionManager.decryptGroupMessage(convId, senderId, envelope);
 *
 * Envelope format (JSON):
 *   { n: messageNumber, c: base64 ciphertext, s: base64 signature }
 */
import {
  encryptSenderMessage,
  decryptSenderMessage,
  serializeSenderMessage,
  deserializeSenderMessage,
  SenderMessage,
} from '../../../../shared/src/crypto/senderKey';
import { senderKeyStore } from './SenderKeyStore';
import { senderKeyManager } from './SenderKeyManager';

export class GroupSessionManager {
  private locks = new Map<string, Promise<void>>();

  /** Serialize per-conversation ops to avoid chain key races */
  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolve!: () => void;
    this.locks.set(key, new Promise<void>((r) => (resolve = r)));
    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolve();
    }
  }

  /**
   * Encrypt a plaintext message for a group.
   * Ensures we have a sender key (generates + distributes if not).
   *
   * @param conversationId — group ID
   * @param plaintext — string to encrypt
   * @param otherMemberIds — other group participants (excluding self)
   * @returns wire-format JSON string ready to send
   */
  async encryptGroupMessage(
    conversationId: string,
    plaintext: string,
    otherMemberIds: string[],
  ): Promise<string> {
    return this.withLock(`own:${conversationId}`, async () => {
      // Ensure we have a sender key (generates and distributes if missing)
      const state = await senderKeyManager.ensureOwnSenderKey(conversationId, otherMemberIds);

      const plaintextBytes = new TextEncoder().encode(plaintext);
      const ad = new TextEncoder().encode(conversationId); // bind to group
      const msg = encryptSenderMessage(state, plaintextBytes, ad);

      // Persist updated state (chain key ratcheted, messageNumber++)
      await senderKeyStore.saveOwn(conversationId, state);

      return JSON.stringify(serializeSenderMessage(msg));
    });
  }

  /**
   * Decrypt a group message from a specific sender.
   *
   * @param conversationId — group ID
   * @param senderUserId — who sent it (NOT me)
   * @param envelopeJson — wire-format JSON string
   * @returns decrypted plaintext string
   * @throws if we don't have the sender's key, or decryption fails
   */
  async decryptGroupMessage(
    conversationId: string,
    senderUserId: string,
    envelopeJson: string,
  ): Promise<string> {
    return this.withLock(`recv:${conversationId}:${senderUserId}`, async () => {
      let receiver = await senderKeyStore.loadReceiver(conversationId, senderUserId);

      if (!receiver) {
        // We don't have this sender's key yet — try to fetch pending bundles
        const processed = await senderKeyManager.fetchPendingSenderKeys(conversationId);
        if (processed > 0) {
          receiver = await senderKeyStore.loadReceiver(conversationId, senderUserId);
        }
      }

      if (!receiver) {
        throw new Error(`No sender key from ${senderUserId} in group ${conversationId}`);
      }

      const wire = JSON.parse(envelopeJson);
      const msg: SenderMessage = deserializeSenderMessage(wire);

      const ad = new TextEncoder().encode(conversationId);
      const plaintextBytes = decryptSenderMessage(receiver, msg, ad);

      // Persist updated receiver state (ratcheted forward, skipped keys cached)
      await senderKeyStore.saveReceiver(conversationId, senderUserId, receiver);

      return new TextDecoder().decode(plaintextBytes);
    });
  }

  /**
   * Check if we can currently send E2EE messages in this group.
   * (We have own key OR can generate one — always true in practice.)
   */
  async canEncrypt(_conversationId: string): Promise<boolean> {
    return true; // own key can always be generated on-demand
  }

  /**
   * Check if we can decrypt messages from this sender.
   * Returns false if we need to wait for their key to arrive.
   */
  async canDecryptFrom(conversationId: string, senderUserId: string): Promise<boolean> {
    const receiver = await senderKeyStore.loadReceiver(conversationId, senderUserId);
    return receiver !== null;
  }

  /** Reset all E2EE state for a group (e.g. leaving). */
  async resetGroup(conversationId: string): Promise<void> {
    await senderKeyManager.forgetGroup(conversationId);
  }
}

export const groupSessionManager = new GroupSessionManager();
