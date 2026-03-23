import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  type: 'text' | 'image' | 'file' | 'voice' | 'system';
  text: string | null;
  encryptedPayload: Buffer | null;
  iv: Buffer | null;
  senderRatchetKey: Buffer | null;
  messageIndex: number | null;
  previousChainLength: number | null;
  attachments: Array<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
  replyToId: Types.ObjectId | null;
  forwardedFrom: {
    originalSenderName: string;
    originalText: string | null;
  } | null;
  reactions: Array<{ emoji: string; userId: Types.ObjectId }>;
  editedAt: Date | null;
  deletedAt: Date | null;
  status: 'sent' | 'delivered' | 'read';
  deliveredVia: 'ws' | 'push' | 'rss' | 'mesh';
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'file', 'voice', 'system'], default: 'text' },
    text: { type: String, default: null },
    encryptedPayload: { type: Buffer, default: null },
    iv: { type: Buffer, default: null },
    senderRatchetKey: { type: Buffer, default: null },
    messageIndex: { type: Number, default: null },
    previousChainLength: { type: Number, default: null },
    attachments: [
      {
        fileId: String,
        fileName: String,
        mimeType: String,
        size: Number,
        url: String,
      },
    ],
    replyToId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    forwardedFrom: {
      type: {
        originalSenderName: String,
        originalText: String,
      },
      default: null,
    },
    reactions: [{ emoji: String, userId: { type: Schema.Types.ObjectId, ref: 'User' } }],
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    deliveredVia: { type: String, enum: ['ws', 'push', 'rss', 'mesh'], default: 'ws' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
