import { SignJWT } from 'jose';
import nodemailer from 'nodemailer';
import { config } from '../config';

const secret = new TextEncoder().encode(config.JWT_SECRET);

// SMTP transport
const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465, // true for 465, false for 587
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // for self-signed certs
  },
});

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
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${config.BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;

  try {
    await transporter.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject: 'FOMO Chat — Подтверждение email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #fff; border-radius: 12px;">
          <h2 style="color: #6366f1; text-align: center;">FOMO Chat</h2>
          <p style="text-align: center; color: #ccc;">Подтвердите ваш email для завершения регистрации</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="display: inline-block; padding: 14px 32px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Подтвердить email
            </a>
          </div>
          <p style="text-align: center; color: #888; font-size: 12px;">
            Если вы не регистрировались в FOMO Chat, проигнорируйте это письмо.
          </p>
          <p style="text-align: center; color: #888; font-size: 11px;">
            Ссылка действительна 24 часа
          </p>
        </div>
      `,
      text: `FOMO Chat — Подтверждение email\n\nПерейдите по ссылке для подтверждения: ${link}\n\nСсылка действительна 24 часа.`,
    });
    console.log(`[EMAIL] Verification email sent to ${email}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send verification email to ${email}:`, err);
    // Don't throw — registration should not fail because of email
  }
}
