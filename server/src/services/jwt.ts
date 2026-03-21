import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { config } from '../config';

const secret = new TextEncoder().encode(config.JWT_SECRET);

export async function signAccessToken(userId: string, phone: string): Promise<string> {
  return new SignJWT({ phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.JWT_ACCESS_EXPIRY)
    .sign(secret);
}

export async function signRefreshToken(userId: string): Promise<string> {
  const tokenId = crypto.randomUUID();
  return new SignJWT({ tid: tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.JWT_REFRESH_EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string) {
  return jwtVerify(token, secret);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
