import mongoose, { Schema, Document } from 'mongoose';

export interface ISmsCode extends Document {
  phone: string;
  codeHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
}

const smsCodeSchema = new Schema<ISmsCode>({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// TTL index: MongoDB automatically deletes expired documents
smsCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SmsCode = mongoose.model<ISmsCode>('SmsCode', smsCodeSchema);
