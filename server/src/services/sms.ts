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

  // Production: Twilio
  const twilio = await import('twilio');
  const client = twilio.default(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body: `ЭК-26: Ваш код подтверждения: ${code}`,
    from: config.TWILIO_PHONE_NUMBER,
    to: phone,
  });
}
