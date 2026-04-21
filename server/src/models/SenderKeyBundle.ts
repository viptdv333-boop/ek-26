/**
 * Stores encrypted sender keys for group E2EE distribution.
 *
 * When user A creates/rotates their sender key for group G:
 *   - For each other member B in G, A encrypts their sender key via X3DH (pairwise E2EE)
 *   - Uploads bundle: { conversationId, fromUserId: A, toUserId: B, encryptedKey }
 *   - Server stores it; when B comes online, B fetches and decrypts
 *
 * Server never sees the plaintext sender key.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISenderKeyBundle extends Document {
  conversationId: Types.ObjectId;
  fromUserId: Types.ObjectId;   // Whose sender key this is
  toUserId: Types.ObjectId;     // Who should decrypt (intended recipient)
  encryptedKey: string;         // base64 — sender key encrypted via X3DH pairwise session
  createdAt: Date;
}

const senderKeyBundleSchema = new Schema<ISenderKeyBundle>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    encryptedKey: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Most recent bundle per (conv, from, to) wins — unique on tuple
senderKeyBundleSchema.index({ conversationId: 1, fromUserId: 1, toUserId: 1 }, { unique: true });

export const SenderKeyBundle = mongoose.model<ISenderKeyBundle>('SenderKeyBundle', senderKeyBundleSchema);
