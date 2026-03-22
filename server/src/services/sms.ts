import crypto from 'crypto';
import { config } from '../config';

export function generateOtp(): string {
  if (config.SMS_DEV_MODE) {
    return '123456';
  }
  return crypto.randomInt(100000, 999999).toString();
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

interface SmsRuResponse {
  status: string;
  status_code: number;
  status_text?: string;
  sms: Record<string, { status: string; status_code: number; status_text?: string; sms_id?: string }>;
  balance?: number;
}

export async function sendSms(phone: string, code: string): Promise<void> {
  if (config.SMS_DEV_MODE) {
    console.log(`[DEV SMS] Code for ${phone}: ${code}`);
    return;
  }

  // Production: SMS.ru
  const url = new URL('https://sms.ru/sms/send');
  url.searchParams.set('api_id', config.SMSRU_API_ID);
  url.searchParams.set('to', phone.replace(/[^\d+]/g, ''));
  url.searchParams.set('msg', `FOMO: Ваш код: ${code}`);
  url.searchParams.set('json', '1');

  console.log(`[SMS.ru] Sending code to ${phone}...`);

  const res = await fetch(url.toString());
  const data = (await res.json()) as SmsRuResponse;

  console.log(`[SMS.ru] Response:`, JSON.stringify(data));

  // Check global status
  if (data.status !== 'OK') {
    console.error('[SMS.ru] Global error:', data.status_text || data.status_code);
    throw new Error(`SMS.ru error: ${data.status_text || `code ${data.status_code}`}`);
  }

  // Check per-number status
  const phoneStatus = data.sms?.[phone];
  if (phoneStatus && phoneStatus.status !== 'OK') {
    console.error(`[SMS.ru] Phone ${phone} error:`, phoneStatus.status_text || phoneStatus.status_code);
    throw new Error(`SMS.ru: ${phoneStatus.status_text || `code ${phoneStatus.status_code}`}`);
  }

  console.log(`[SMS.ru] SMS sent successfully to ${phone}, balance: ${data.balance}`);
}
