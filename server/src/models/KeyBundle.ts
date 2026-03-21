import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IKeyBundle extends Document {
  userId: Types.ObjectId;
  identityKey: Buffer;              // X25519 identity public key
  signingKey: Buffer;               // Ed25519 signing public key
  signedPreKey: {
    keyId: number;
    publicKey: Buffer;
    signature: Buffer;              // Ed25519 signature over publicKey
    createdAt: Date;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: Buffer;
  }>;
  updatedAt: Date;
}

const keyBundleSchema = new Schema<IKeyBundle>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    identityKey: { type: Buffer, required: true },
    signingKey: { type: Buffer, required: true },
    signedPreKey: {
      keyId: { type: Number, required: true },
      publicKey: { type: Buffer, required: true },
      signature: { type: Buffer, required: true },
      createdAt: { type: Date, default: Date.now },
    },
    oneTimePreKeys: [
      {
        keyId: { type: Number, required: true },
        publicKey: { type: Buffer, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const KeyBundle = mongoose.model<IKeyBundle>('KeyBundle', keyBundleSchema);
