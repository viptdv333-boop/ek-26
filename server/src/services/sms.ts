import crypto from 'crypto';
import https from 'https';
import { getSmsSettings, ISmsSettings } from '../models/Settings';

const DEV_CODE = '1945';

export async function generateOtp(): Promise<string> {
  try {
    const settings = await getSmsSettings();
    if (settings.activeProvider === 'dev') return DEV_CODE;
  } catch { /* fallback to random */ }
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
 * Send verification call/SMS. Returns the actual code to store.
 * Reads active provider from DB settings (cached 60s).
 */
export async function sendCode(phone: string, code: string): Promise<string> {
  let settings: ISmsSettings;
  try {
    settings = await getSmsSettings();
  } catch (err) {
    console.error('[SMS] Failed to load settings, falling back to dev mode:', err);
    console.log(`[DEV OTP] Code for ${phone}: ${DEV_CODE}`);
    return DEV_CODE;
  }

  const provider = settings.activeProvider;

  if (provider === 'dev') {
    console.log(`[DEV OTP] Code for ${phone}: ${code}`);
    return code;
  }

  if (provider === 'numcheck') {
    if (!settings.numcheckToken) {
      throw new Error('NumCheck token not configured');
    }
    return sendCodeViaNumCheck(phone, settings.numcheckToken);
  }

  if (provider === 'ucaller') {
    if (!settings.ucallerServiceId || !settings.ucallerSecretKey) {
      throw new Error('uCaller credentials not configured');
    }
    await sendCodeViaUCaller(phone, code, settings.ucallerServiceId, settings.ucallerSecretKey);
    return code;
  }

  // Unknown provider — dev fallback
  console.warn(`[SMS] Unknown provider '${provider}', using dev mode`);
  console.log(`[DEV OTP] Code for ${phone}: ${code}`);
  return code;
}

async function sendCodeViaNumCheck(phone: string, token: string): Promise<string> {
  const cleanPhone = phone.replace(/[^\d]/g, '');

  console.log(`[NumCheck] Calling ${cleanPhone}...`);

  const data = await new Promise<NumCheckResponse>((resolve, reject) => {
    const req = https.request(
      `https://api.numcheckapi.com/ru/init-call?phone=${cleanPhone}`,
      {
        method: 'POST',
        headers: { 'X-AUTH-Token': token },
        rejectUnauthorized: false,
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch { reject(new Error(`Invalid JSON: ${body}`)); }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('NumCheck timeout')); });
    req.end();
  });
  console.log(`[NumCheck] Response:`, JSON.stringify(data));

  if (data.errorCode) {
    console.error('[NumCheck] Error:', data.message);
    throw new Error(`Ошибка верификации: ${data.message || 'unknown'}`);
  }

  const actualCode = data.code || '';
  console.log(`[NumCheck] Call initiated, callId: ${data.callId}, code: ${actualCode}`);
  return actualCode;
}

async function sendCodeViaUCaller(phone: string, code: string, serviceId: string, secretKey: string): Promise<void> {
  const cleanPhone = phone.replace(/[^\d]/g, '');

  const url = new URL('https://api.ucaller.ru/v1.0/initCall');
  url.searchParams.set('service_id', serviceId);
  url.searchParams.set('key', secretKey);
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
