import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string | null;
  telegramId: number | null;
  telegramUsername: string | null;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  lastSeen: Date;
  fcmTokens: string[];
  apnsTokens: string[];
  rssFeedId: string;
  // E2EE keys (Phase 2)
  identityKeyPublic: Buffer | null;
  signedPreKey: {
    keyId: number;
    publicKey: Buffer;
    signature: Buffer;
    createdAt: Date;
  } | null;
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: Buffer;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, default: null },
    telegramId: { type: Number, default: null },
    telegramUsername: { type: String, default: null },
    displayName: { type: String, required: true, default: '' },
    avatarUrl: { type: String, default: null },
    status: { type: String, default: '' },
    lastSeen: { type: Date, default: Date.now },
    fcmTokens: [{ type: String }],
    apnsTokens: [{ type: String }],
    rssFeedId: { type: String, unique: true, sparse: true },
    identityKeyPublic: { type: Buffer, default: null },
    signedPreKey: {
      type: {
        keyId: Number,
        publicKey: Buffer,
        signature: Buffer,
        createdAt: Date,
      },
      default: null,
    },
    oneTimePreKeys: [
      {
        keyId: Number,
        publicKey: Buffer,
      },
    ],
  },
  { timestamps: true, autoIndex: false }
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ telegramId: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
