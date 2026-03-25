import crypto from 'crypto';
import { config } from '../config';

export function generateOtp(): string {
  if (config.OTP_DEV_MODE) {
    return '1234';
  }
  // 4-digit code (1000–9999)
  return crypto.randomInt(1000, 10000).toString();
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

interface NumCheckResponse {
  callId?: string;
  callerId?: string;
  code?: string;
  statusCode?: number;
  errorCode?: number;
  message?: string;
  success?: boolean;
}

/**
 * Send verification call. Returns the actual code to store.
 * For NumCheckAPI: they generate the code (last 4 digits of caller number)
 * For uCaller: we pass our own code
 * For dev mode: returns the dev code '1234'
 */
export async function sendCode(phone: string, code: string): Promise<string> {
  if (config.OTP_DEV_MODE) {
    console.log(`[DEV OTP] Code for ${phone}: ${code}`);
    return code;
  }

  // Use NumCheckAPI if token is set
  if (config.NUMCHECK_TOKEN) {
    return sendCodeViaNumCheck(phone);
  }

  // Fallback: uCaller (we pass our code)
  await sendCodeViaUCaller(phone, code);
  return code;
}

async function sendCodeViaNumCheck(phone: string): Promise<string> {
  const cleanPhone = phone.replace(/[^\d]/g, ''); // digits only, no +

  console.log(`[NumCheck] Calling ${cleanPhone}...`);

  const url = `https://api.numcheckapi.com/ru/init-call?phone=${cleanPhone}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-AUTH-Token': config.NUMCHECK_TOKEN,
    },
  });

  const data = (await res.json()) as NumCheckResponse;
  console.log(`[NumCheck] Response:`, JSON.stringify(data));

  if (data.errorCode) {
    console.error('[NumCheck] Error:', data.message);
    throw new Error(`Ошибка верификации: ${data.message || 'unknown'}`);
  }

  const actualCode = data.code || '';
  console.log(`[NumCheck] Call initiated, callId: ${data.callId}, code: ${actualCode}`);
  return actualCode;
}

async function sendCodeViaUCaller(phone: string, code: string): Promise<void> {
  const cleanPhone = phone.replace(/[^\d]/g, '');

  const url = new URL('https://api.ucaller.ru/v1.0/initCall');
  url.searchParams.set('service_id', config.UCALLER_SERVICE_ID);
  url.searchParams.set('key', config.UCALLER_SECRET_KEY);
  url.searchParams.set('phone', cleanPhone);
  url.searchParams.set('code', code);

  console.log(`[uCaller] Calling ${cleanPhone} with code ${code}...`);

  const res = await fetch(url.toString());
  const data = (await res.json()) as any;
  console.log(`[uCaller] Response:`, JSON.stringify(data));

  if (!data.status) {
    console.error('[uCaller] Error:', data.error);
    throw new Error(`uCaller error: ${data.error || 'unknown'}`);
  }
}
