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

export async function sendSms(phone: string, code: string): Promise<void> {
  if (config.SMS_DEV_MODE) {
    console.log(`[DEV SMS] Code for ${phone}: ${code}`);
    return;
  }

  // Production: SMS.ru
  const url = new URL('https://sms.ru/sms/send');
  url.searchParams.set('api_id', config.SMSRU_API_ID);
  url.searchParams.set('to', phone);
  url.searchParams.set('msg', `ЭК-26: Ваш код: ${code}`);
  url.searchParams.set('json', '1');

  const res = await fetch(url.toString());
  const data = (await res.json()) as { status: string; status_text?: string };

  if (data.status !== 'OK') {
    console.error('[SMS.ru] Send failed:', data);
    throw new Error(`SMS.ru error: ${data.status_text || 'unknown'}`);
  }
}
