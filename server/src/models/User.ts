import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string | null;
  telegramId: number | null;
  telegramUsername: string | null;
  yandexId: string | null;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  emailVerified: boolean;
  passwordHash: string | null;
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
  blockedUsers: mongoose.Types.ObjectId[];
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, default: null },
    telegramId: { type: Number },
    telegramUsername: { type: String },
    yandexId: { type: String, default: null },
    displayName: { type: String, required: true, default: '' },
    avatarUrl: { type: String, default: null },
    email: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    passwordHash: { type: String, default: null },
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
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true, autoIndex: false }
);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ telegramId: 1 }, { unique: true, partialFilterExpression: { telegramId: { $type: 'number' } } });
userSchema.index({ yandexId: 1 }, { unique: true, partialFilterExpression: { yandexId: { $type: 'string' } } });

export const User = mongoose.model<IUser>('User', userSchema);
