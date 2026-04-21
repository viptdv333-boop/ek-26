/**
 * SenderKeyManager — manages distribution and receipt of group E2EE sender keys.
 *
 * Responsibilities:
 *   1. Generate own sender key for a group (first time)
 *   2. Distribute it to all group members (encrypt via X3DH, upload to server)
 *   3. Fetch pending sender keys for groups we're in and store them
 *   4. Handle WS notifications about new sender keys
 *
 * The actual group message encryption lives in GroupSessionManager.
 */
import {
  createSenderKey,
  getSenderKeyDistribution,
  processSenderKeyDistribution,
  serializeDistribution,
  deserializeDistribution,
  SenderKeyState,
  SenderKeyDistribution,
} from '../../../../shared/src/crypto/senderKey';
import { conversationsApi } from '../api/endpoints';
import { senderKeyStore } from './SenderKeyStore';
import { sessionManager } from './index';

export class SenderKeyManager {
  /**
   * Ensure we have our own sender key for this conversation.
   * If missing — generate a new one and distribute to all other members.
   */
  async ensureOwnSenderKey(conversationId: string, otherMemberIds: string[]): Promise<SenderKeyState> {
    const existing = await senderKeyStore.loadOwn(conversationId);
    if (existing) return existing;

    return this.rotateOwnSenderKey(conversationId, otherMemberIds);
  }

  /**
   * Generate a new sender key for this conversation and distribute it.
   * Called on: creating a group, joining, adding/removing a member (rotation).
   */
  async rotateOwnSenderKey(conversationId: string, otherMemberIds: string[]): Promise<SenderKeyState> {
    const state = createSenderKey();
    await senderKeyStore.saveOwn(conversationId, state);

    // Distribute to all other members
    await this.distributeSenderKey(conversationId, state, otherMemberIds);

    return state;
  }

  /**
   * Encrypt own sender key distribution for each recipient via X3DH, upload.
   */
  async distributeSenderKey(
    conversationId: string,
    state: SenderKeyState,
    recipientIds: string[],
  ): Promise<void> {
    const distribution = getSenderKeyDistribution(state);
    const distJson = JSON.stringify(serializeDistribution(distribution));

    const bundles: Array<{ toUserId: string; encryptedKey: string }> = [];

    for (const recipientId of recipientIds) {
      try {
        // Encrypt distribution via pairwise E2EE (X3DH + Double Ratchet)
        const encryptedKey = await sessionManager.encryptMessage(recipientId, distJson);
        bundles.push({ toUserId: recipientId, encryptedKey });
      } catch (err) {
        console.warn(`[SenderKey] Failed to encrypt for ${recipientId}:`, err);
        // Continue with other recipients
      }
    }

    if (bundles.length === 0) {
      throw new Error('Failed to encrypt sender key for any recipient');
    }

    await conversationsApi.uploadSenderKeys(conversationId, bundles);
  }

  /**
   * Fetch and process all pending sender keys for a group.
   * Decrypts each via X3DH, stores as receiver state.
   * Returns number of keys successfully processed.
   */
  async fetchPendingSenderKeys(conversationId: string): Promise<number> {
    const bundles = await conversationsApi.fetchSenderKeys(conversationId);
    let processed = 0;

    for (const bundle of bundles) {
      try {
        const distJson = await sessionManager.decryptMessage(bundle.fromUserId, bundle.encryptedKey);
        const distribution = deserializeDistribution(JSON.parse(distJson));
        const receiverState = processSenderKeyDistribution(distribution);
        await senderKeyStore.saveReceiver(conversationId, bundle.fromUserId, receiverState);

        // Clean up on server after successful processing
        await conversationsApi.deleteSenderKeyBundle(conversationId, bundle.fromUserId).catch(() => {});
        processed++;
      } catch (err) {
        console.warn(`[SenderKey] Failed to process bundle from ${bundle.fromUserId}:`, err);
      }
    }

    return processed;
  }

  /**
   * Handle WS notification `group:senderkey` — fetch the new bundle(s).
   */
  async handleSenderKeyNotification(conversationId: string, _fromUserId: string): Promise<void> {
    // Simply fetch all pending — server will return just the new ones
    await this.fetchPendingSenderKeys(conversationId);
  }

  /**
   * Forget all E2EE state for a group (on leave or manual reset).
   */
  async forgetGroup(conversationId: string): Promise<void> {
    await senderKeyStore.deleteAll(conversationId);
  }
}

export const senderKeyManager = new SenderKeyManager();
