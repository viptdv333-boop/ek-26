import { FastifyInstance } from 'fastify';
import { requestCodeSchema, verifyCodeSchema } from '@ek-26/shared';
import { User } from '../models/User';
import { SmsCode } from '../models/SmsCode';
import { Session } from '../models/Session';
import { generateOtp, hashOtp, sendSms } from '../services/sms';
import { signAccessToken, signRefreshToken, hashToken, verifyToken } from '../services/jwt';
import crypto from 'crypto';

export async function authRoutes(app: FastifyInstance) {
  // Request SMS code
  app.post('/api/auth/request-code', async (request, reply) => {
    const body = requestCodeSchema.parse(request.body);

    // Rate limit: max 1 code per phone per 60 seconds
    const recent = await SmsCode.findOne({
      phone: body.phone,
      createdAt: { $gte: new Date(Date.now() - 60_000) },
    });
    if (recent) {
      return reply.code(429).send({ error: 'Please wait before requesting a new code' });
    }

    // Delete old codes for this phone
    await SmsCode.deleteMany({ phone: body.phone });

    const code = generateOtp();
    await SmsCode.create({
      phone: body.phone,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 5 * 60_000), // 5 minutes
    });

    await sendSms(body.phone, code);

    return { success: true };
  });

  // Verify SMS code and login/register
  app.post('/api/auth/verify-code', async (request, reply) => {
    const body = verifyCodeSchema.parse(request.body);

    const smsCode = await SmsCode.findOne({ phone: body.phone });
    if (!smsCode) {
      return reply.code(400).send({ error: 'No code requested for this phone' });
    }

    if (smsCode.attempts >= 5) {
      await SmsCode.deleteOne({ _id: smsCode._id });
      return reply.code(429).send({ error: 'Too many attempts. Request a new code.' });
    }

    if (smsCode.expiresAt < new Date()) {
      await SmsCode.deleteOne({ _id: smsCode._id });
      return reply.code(400).send({ error: 'Code expired' });
    }

    if (smsCode.codeHash !== hashOtp(body.code)) {
      smsCode.attempts += 1;
      await smsCode.save();
      return reply.code(400).send({ error: 'Invalid code' });
    }

    // Code is valid — delete it
    await SmsCode.deleteOne({ _id: smsCode._id });

    // Find or create user
    let isNewUser = false;
    let user = await User.findOne({ phone: body.phone });
    if (!user) {
      isNewUser = true;
      user = await User.create({
        phone: body.phone,
        displayName: body.phone, // Temporary, user will set proper name
        rssFeedId: crypto.randomUUID(),
      });
    }

    // Create tokens
    const userId = user._id.toString();
    const accessToken = await signAccessToken(userId, user.phone);
    const refreshToken = await signRefreshToken(userId);

    // Save session
    await Session.create({
      userId: user._id,
      deviceId: crypto.randomUUID(), // TODO: get from client
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000), // 30 days
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        phone: user.phone,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isNewUser,
      },
    };
  });

  // Telegram Login Widget auth
  app.post('/api/auth/telegram', async (request, reply) => {
    const { config } = await import('../config');
    if (!config.TELEGRAM_BOT_TOKEN) {
      return reply.code(500).send({ error: 'Telegram auth not configured' });
    }

    const data = request.body as Record<string, string | number>;
    const { hash, ...rest } = data;
    if (!hash) {
      return reply.code(400).send({ error: 'Missing hash' });
    }

    // Verify auth_date is not too old (allow 5 minutes)
    const authDate = Number(rest.auth_date);
    if (Date.now() / 1000 - authDate > 300) {
      return reply.code(400).send({ error: 'Auth data expired' });
    }

    // Verify HMAC-SHA256 signature
    const secretKey = crypto.createHash('sha256').update(config.TELEGRAM_BOT_TOKEN).digest();
    const checkString = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join('\n');
    const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (hmac !== hash) {
      return reply.code(401).send({ error: 'Invalid Telegram signature' });
    }

    // Find or create user by telegramId
    const telegramId = Number(rest.id);
    let isNewUser = false;
    let user = await User.findOne({ telegramId });
    if (!user) {
      isNewUser = true;
      const displayName = [rest.first_name, rest.last_name].filter(Boolean).join(' ') || `tg_${telegramId}`;
      user = await User.create({
        telegramId,
        telegramUsername: rest.username || null,
        displayName,
        avatarUrl: rest.photo_url || null,
        rssFeedId: crypto.randomUUID(),
      });
    }

    // Create tokens
    const userId = user._id.toString();
    const accessToken = await signAccessToken(userId, user.phone || `tg:${telegramId}`);
    const refreshToken = await signRefreshToken(userId);

    await Session.create({
      userId: user._id,
      deviceId: crypto.randomUUID(),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        phone: user.phone,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isNewUser,
      },
    };
  });

  // Refresh access token
  app.post('/api/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.code(400).send({ error: 'refreshToken required' });
    }

    try {
      const { payload } = await verifyToken(refreshToken);
      const userId = payload.sub as string;

      const session = await Session.findOne({
        userId,
        refreshTokenHash: hashToken(refreshToken),
      });
      if (!session) {
        return reply.code(401).send({ error: 'Session not found' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      const newAccessToken = await signAccessToken(userId, user.phone);
      const newRefreshToken = await signRefreshToken(userId);

      // Rotate refresh token
      session.refreshTokenHash = hashToken(newRefreshToken);
      session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000);
      await session.save();

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Logout
  app.post('/api/auth/logout', { preHandler: [app.authenticate] }, async (request) => {
    await Session.deleteMany({ userId: request.userId });
    return { success: true };
  });
}
