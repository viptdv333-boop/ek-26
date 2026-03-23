import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IContact extends Document {
  userId: Types.ObjectId;
  contactUserId: Types.ObjectId;
  nickname: string | null;
  createdAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nickname: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

contactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
