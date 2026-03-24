import { SignJWT } from 'jose';
import { config } from '../config';

const secret = new TextEncoder().encode(config.JWT_SECRET);

/**
 * Sign a short-lived JWT used as the email-verification token.
 * Payload contains the userId; expires in 24 hours.
 */
export async function signEmailVerificationToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: 'email-verify' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Send a verification email to the user.
 * Currently logs to console; replace with nodemailer / SES when SMTP is configured.
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${config.BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;

  // TODO: replace with real SMTP transport (nodemailer)
  console.log(`[EMAIL] Verification email for ${email}`);
  console.log(`[EMAIL] Link: ${link}`);
}
