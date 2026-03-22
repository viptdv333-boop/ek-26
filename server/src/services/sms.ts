import crypto from 'crypto';
import { config } from '../config';

export function generateOtp(): string {
  if (config.OTP_DEV_MODE) {
    return '1234';
  }
  // 4-digit code for uCaller (0001–9999)
  return crypto.randomInt(1, 10000).toString().padStart(4, '0');
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

interface UCallerResponse {
  status: boolean;
  ucaller_id?: number;
  phone?: number;
  code?: number;
  client?: string;
  unique_request_id?: string;
  exists?: boolean;
  free_repeated?: boolean;
  error?: string;
}

export async function sendCode(phone: string, code: string): Promise<void> {
  if (config.OTP_DEV_MODE) {
    console.log(`[DEV OTP] Code for ${phone}: ${code}`);
    return;
  }

  // Production: uCaller flash call
  const cleanPhone = phone.replace(/[^\d]/g, '');

  const url = new URL('https://api.ucaller.ru/v1.0/initCall');
  url.searchParams.set('service_id', config.UCALLER_SERVICE_ID);
  url.searchParams.set('key', config.UCALLER_SECRET_KEY);
  url.searchParams.set('phone', cleanPhone);
  url.searchParams.set('code', code);

  console.log(`[uCaller] Calling ${cleanPhone} with code ${code}...`);

  const res = await fetch(url.toString());
  const data = (await res.json()) as UCallerResponse;

  console.log(`[uCaller] Response:`, JSON.stringify(data));

  if (!data.status) {
    console.error('[uCaller] Error:', data.error);
    throw new Error(`uCaller error: ${data.error || 'unknown'}`);
  }

  console.log(`[uCaller] Call initiated, ucaller_id: ${data.ucaller_id}`);
}
