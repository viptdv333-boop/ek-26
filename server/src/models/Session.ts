import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  refreshTokenHash: string;
  deviceName: string;
  ip: string;
  lastActiveAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

const sessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true },
  refreshTokenHash: { type: String, required: true },
  deviceName: { type: String, default: '' },
  ip: { type: String, default: '' },
  lastActiveAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
