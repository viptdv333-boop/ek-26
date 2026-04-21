/**
 * SenderKeyStore — typed wrapper around KeyStore for group E2EE.
 *
 * Provides type-safe storage for:
 *   - Own sender keys (one per conversation)
 *   - Receiver sender keys (one per conversation × sender)
 *
 * Keys are serialized to JSON-safe form before storage.
 */
import {
  SenderKeyState,
  SenderKeyReceiverState,
  SerializedSenderKeyState,
  SerializedSenderKeyReceiverState,
  serializeSenderKeyState,
  deserializeSenderKeyState,
  serializeReceiverState,
  deserializeReceiverState,
} from '../../../../shared/src/crypto/senderKey';
import { keyStore } from './KeyStore';

export class SenderKeyStore {
  /* ── Own sender keys (for sending) ───────────────────────────── */

  /** Save (create or replace) our own sender key for a group. */
  async saveOwn(conversationId: string, state: SenderKeyState): Promise<void> {
    const ser = serializeSenderKeyState(state);
    await keyStore.saveOwnSenderKey(conversationId, ser);
  }

  /** Load our own sender key for a group (null if not initialized). */
  async loadOwn(conversationId: string): Promise<SenderKeyState | null> {
    const ser = (await keyStore.getOwnSenderKey(conversationId)) as SerializedSenderKeyState | null;
    return ser ? deserializeSenderKeyState(ser) : null;
  }

  /** Delete our own sender key (e.g. when leaving or rotating). */
  async deleteOwn(conversationId: string): Promise<void> {
    await keyStore.deleteOwnSenderKey(conversationId);
  }

  /* ── Receiver sender keys (for decrypting others' messages) ─── */

  /** Save/replace a receiver state for a specific sender in a group. */
  async saveReceiver(
    conversationId: string,
    senderUserId: string,
    state: SenderKeyReceiverState,
  ): Promise<void> {
    const ser = serializeReceiverState(state);
    await keyStore.saveReceiverSenderKey(conversationId, senderUserId, ser);
  }

  /** Load receiver state for a sender (null if we don't have their key yet). */
  async loadReceiver(
    conversationId: string,
    senderUserId: string,
  ): Promise<SenderKeyReceiverState | null> {
    const ser = (await keyStore.getReceiverSenderKey(
      conversationId,
      senderUserId,
    )) as SerializedSenderKeyReceiverState | null;
    return ser ? deserializeReceiverState(ser) : null;
  }

  /** List all receiver states we have for a group. */
  async loadAllReceivers(
    conversationId: string,
  ): Promise<Array<{ senderUserId: string; state: SenderKeyReceiverState }>> {
    const all = await keyStore.getAllReceiverSenderKeys(conversationId);
    return all.map(({ senderUserId, data }) => ({
      senderUserId,
      state: deserializeReceiverState(data as SerializedSenderKeyReceiverState),
    }));
  }

  /** Delete one receiver key (e.g. sender was removed from group or rotated). */
  async deleteReceiver(conversationId: string, senderUserId: string): Promise<void> {
    await keyStore.deleteReceiverSenderKey(conversationId, senderUserId);
  }

  /** Delete all E2EE keys for a conversation (on leave or full reset). */
  async deleteAll(conversationId: string): Promise<void> {
    await keyStore.deleteAllSenderKeys(conversationId);
  }

  /* ── Convenience checks ──────────────────────────────────────── */

  /** Do we have any E2EE state for this group? */
  async hasAny(conversationId: string): Promise<boolean> {
    const own = await this.loadOwn(conversationId);
    if (own) return true;
    const recvs = await this.loadAllReceivers(conversationId);
    return recvs.length > 0;
  }

  /** Set of senderUserIds we have receiver keys for in this group. */
  async knownSenders(conversationId: string): Promise<Set<string>> {
    const all = await keyStore.getAllReceiverSenderKeys(conversationId);
    return new Set(all.map((r) => r.senderUserId));
  }
}

export const senderKeyStore = new SenderKeyStore();
