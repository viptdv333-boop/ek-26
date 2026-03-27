import mongoose, { Schema, Document } from 'mongoose';

export interface ISmsSettings {
  activeProvider: 'numcheck' | 'ucaller' | 'alibaba' | 'dev';
  numcheckToken: string;
  ucallerServiceId: string;
  ucallerSecretKey: string;
  alibabaAccessKeyId: string;
  alibabaAccessKeySecret: string;
  alibabaSignName: string;
  alibabaTemplateCode: string;
}

export interface ISettings extends Document {
  key: string;
  value: any;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

// Get SMS settings with auto-init from env vars
let smsCache: { data: ISmsSettings; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60 sec

export async function getSmsSettings(): Promise<ISmsSettings> {
  if (smsCache && Date.now() - smsCache.ts < CACHE_TTL) {
    return smsCache.data;
  }

  const doc = await Settings.findOne({ key: 'sms' }).lean() as any;

  if (!doc) {
    // Auto-init from env vars on first run
    const config = await import('../config').then(m => m.config);
    const initial: ISmsSettings = {
      activeProvider: config.OTP_DEV_MODE ? 'dev' : (config.NUMCHECK_TOKEN ? 'numcheck' : 'ucaller'),
      numcheckToken: config.NUMCHECK_TOKEN || '',
      ucallerServiceId: config.UCALLER_SERVICE_ID || '',
      ucallerSecretKey: config.UCALLER_SECRET_KEY || '',
      alibabaAccessKeyId: '',
      alibabaAccessKeySecret: '',
      alibabaSignName: '',
      alibabaTemplateCode: '',
    };
    await Settings.create({ key: 'sms', value: initial });
    const data = initial;
    smsCache = { data, ts: Date.now() };
    return data;
  }

  const data = doc.value as ISmsSettings;
  smsCache = { data, ts: Date.now() };
  return data;
}

export function invalidateSmsCache() {
  smsCache = null;
}
