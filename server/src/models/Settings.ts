import mongoose, { Schema, Document } from 'mongoose';

export interface ISmsSettings {
  activeProvider: 'numcheck' | 'ucaller' | 'alibaba' | 'twilio' | 'dev';
  numcheckToken: string;
  ucallerServiceId: string;
  ucallerSecretKey: string;
  alibabaAccessKeyId: string;
  alibabaAccessKeySecret: string;
  alibabaSignName: string;
  alibabaTemplateCode: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioVerifyServiceSid: string;
  twilioPhoneNumber: string;
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
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioVerifyServiceSid: '',
      twilioPhoneNumber: '',
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

// ── AI Settings ─────────────────────────────────────────────────
export interface IAiSettings {
  provider: 'gemini' | 'openai' | 'openrouter' | 'disabled';
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  dailyLimitPerUser: number;
  systemPrompt: string;
  searchEnabled: boolean;
}

let aiCache: { data: IAiSettings; ts: number } | null = null;

export async function getAiSettings(): Promise<IAiSettings> {
  if (aiCache && Date.now() - aiCache.ts < CACHE_TTL) {
    return aiCache.data;
  }

  const doc = await Settings.findOne({ key: 'ai' }).lean() as any;

  if (!doc) {
    const config = await import('../config').then(m => m.config);
    const initial: IAiSettings = {
      provider: 'openrouter',
      geminiApiKey: config.GEMINI_API_KEY || '',
      geminiModel: 'gemini-2.5-flash',
      openaiApiKey: '',
      openaiModel: 'gpt-4o-mini',
      openrouterApiKey: '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',
      openrouterModel: 'qwen/qwen3.6-plus-preview:free',
      dailyLimitPerUser: 10,
      systemPrompt: 'Ты — AI-помощник FOMO Chat. Отвечай кратко, полезно, дружелюбно. Поддерживаешь русский, английский, китайский. Можешь искать информацию в интернете.',
      searchEnabled: true,
    };
    await Settings.create({ key: 'ai', value: initial });
    aiCache = { data: initial, ts: Date.now() };
    return initial;
  }

  const data = doc.value as IAiSettings;
  aiCache = { data, ts: Date.now() };
  return data;
}

export function invalidateAiCache() {
  aiCache = null;
}
