import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  type: 'direct' | 'group' | 'ai';
  participants: Types.ObjectId[];
  groupMeta: {
    name: string;
    description: string | null;
    avatarUrl: string | null;
    admins: Types.ObjectId[];
    createdBy: Types.ObjectId;
  } | null;
  lastMessage: {
    text: string;
    senderName: string;
    timestamp: Date;
  } | null;
  pinnedMessages: Array<{
    messageId: Types.ObjectId;
    pinnedBy: Types.ObjectId;
    pinnedAt: Date;
  }>;
  archivedBy: Types.ObjectId[];
  mutedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: ['direct', 'group', 'ai'], required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    groupMeta: {
      type: {
        name: { type: String, required: true },
        description: { type: String, default: null },
        avatarUrl: { type: String, default: null },
        admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
      default: null,
    },
    lastMessage: {
      type: {
        text: String,
        senderName: String,
        timestamp: Date,
      },
      default: null,
    },
    pinnedMessages: [{
      messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
      pinnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      pinnedAt: { type: Date, default: Date.now },
    }],
    archivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mutedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
