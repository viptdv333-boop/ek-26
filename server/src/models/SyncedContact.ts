import mongoose, { Schema, Document } from 'mongoose';

export interface ISyncedContact extends Document {
  ownerId: mongoose.Types.ObjectId;
  phone: string;
  name: string;
  avatarUrl?: string;
  source: 'google' | 'apple' | 'vcf';
  registeredUserId?: mongoose.Types.ObjectId;
  isRegistered: boolean;
}

const syncedContactSchema = new Schema<ISyncedContact>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, required: true },
    name: { type: String, default: '' },
    avatarUrl: { type: String },
    source: { type: String, enum: ['google', 'apple', 'vcf'], default: 'google' },
    registeredUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    isRegistered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

syncedContactSchema.index({ ownerId: 1, phone: 1 }, { unique: true });

export const SyncedContact = mongoose.model<ISyncedContact>('SyncedContact', syncedContactSchema);
