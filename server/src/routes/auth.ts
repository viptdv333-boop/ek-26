import { FastifyInstance } from 'fastify';
import { requestCodeSchema, verifyCodeSchema, registerSchema, registerSetPasswordSchema, loginSchema, setPasswordSchema } from '@ek-26/shared';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { SmsCode } from '../models/SmsCode';
import { Session } from '../models/Session';
import { generateOtp, hashOtp, sendCode } from '../services/sms';
import { signAccessToken, signRefreshToken, hashToken, verifyToken } from '../services/jwt';
import { signEmailVerificationToken, sendVerificationEmail } from '../services/email';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import crypto from 'crypto';

function getDeviceInfo(request: any): { deviceName: string; ip: string } {
  const ua = request.headers['user-agent'] || '';
  let deviceName = 'Unknown';
  if (/Android/i.test(ua)) deviceName = 'Android';
  else if (/iPhone|iPad/i.test(ua)) deviceName = 'iOS';
  else if (/Windows/i.test(ua)) deviceName = 'Windows';
  else if (/Macintosh/i.test(ua)) deviceName = 'macOS';
  else if (/Linux/i.test(ua)) deviceName = 'Linux';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) deviceName += ' Chrome';
  else if (/Firefox/i.test(ua)) deviceName += ' Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) deviceName += ' Safari';
  else if (/Edg/i.test(ua)) deviceName += ' Edge';
  const ip = (request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.ip || '').split(',')[0].trim();
  return { deviceName, ip };
}

// Async GeoIP lookup — enriches session with city after creation
async function enrichSessionGeo(sessionId: string, ip: string) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('172.') || ip.startsWith('10.') || ip.startsWith('192.168.')) return;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,country&lang=ru`);
    const data = await res.json() as any;
    if (data.city) {
      await Session.findByIdAndUpdate(sessionId, { ip: `${ip} · ${data.city}, ${data.country}` });
    }
  } catch {}
}

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

    const generatedCode = generateOtp();

    try {
      const actualCode = await sendCode(body.phone, generatedCode);
      await SmsCode.create({
        phone: body.phone,
        codeHash: hashOtp(actualCode),
        expiresAt: new Date(Date.now() + 5 * 60_000), // 5 minutes
      });
    } catch (err: any) {
      app.log.error({ err, msg: 'SMS send failed' });
      return reply.code(502).send({ error: 'Не удалось отправить SMS. Попробуйте позже.' });
    }

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
    const accessToken = await signAccessToken(userId, user.phone || '');
    const refreshToken = await signRefreshToken(userId);

    // Save session
    const { deviceName, ip } = getDeviceInfo(request);
    await Session.create({
      userId: user._id,
      deviceId: crypto.randomUUID(),
      refreshTokenHash: hashToken(refreshToken),
      deviceName,
      ip,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });

    const needsPassword = !user.passwordHash;

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
      ...(needsPassword && { needsPassword: true }),
    };
  });

  // Telegram Login Widget auth
  app.post('/api/auth/telegram', async (request, reply) => {
    try {
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
        app.log.error({ checkString, hmac, hash, tokenLen: config.TELEGRAM_BOT_TOKEN.length }, 'Telegram HMAC mismatch');
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
      const accessToken = await signAccessToken(userId, user.phone || '');
      const refreshToken = await signRefreshToken(userId);

      { const di = getDeviceInfo(request);
      await Session.create({
        userId: user._id,
        deviceId: crypto.randomUUID(),
        refreshTokenHash: hashToken(refreshToken),
        deviceName: di.deviceName,
        ip: di.ip,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
      }); enrichSessionGeo((await Session.findOne({ userId: user._id }).sort({ createdAt: -1 }))?._id?.toString() || '', di.ip); }

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
    } catch (err: any) {
      app.log.error({ err, msg: 'Telegram auth error' });
      return reply.code(500).send({ error: err.message || 'Telegram auth failed' });
    }
  });

  // Mobile Telegram Login page — opens in browser, redirects back to app with tokens
  app.get('/auth/telegram-mobile', async (request, reply) => {
    const { config } = await import('../config');
    const botName = 'chat_fomo_bot';
    const baseUrl = config.BASE_URL || `${request.protocol}://${request.hostname}`;

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FOMO Chat — Вход через Telegram</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f0f23;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #888; margin-bottom: 24px; font-size: 14px; }
    #tg-widget { min-height: 44px; }
    .success {
      background: #1a1a3e;
      border: 1px solid #5b5bf0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      max-width: 320px;
    }
    .success h2 { color: #7c7cff; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>FOMO Chat</h1>
  <p>Нажмите кнопку для входа через Telegram</p>
  <div id="tg-widget"></div>
  <div id="result" style="display:none"></div>

  <script>
    function onTelegramAuth(user) {
      document.getElementById('tg-widget').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').innerHTML = '<div class="success"><h2>Авторизация...</h2><p>Подождите</p></div>';

      fetch('${baseUrl}/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      })
      .then(r => r.json())
      .then(data => {
        if (data.accessToken) {
          document.getElementById('result').innerHTML = '<div class="success"><h2>Успешно!</h2><p>Возвращаемся в приложение...</p></div>';
          // Deep link back to FOMO Chat app with tokens
          window.location.href = 'fomochat://auth?token=' + encodeURIComponent(data.accessToken)
            + '&refreshToken=' + encodeURIComponent(data.refreshToken)
            + '&userId=' + encodeURIComponent(data.user.id)
            + '&displayName=' + encodeURIComponent(data.user.displayName || '')
            + '&isNewUser=' + (data.user.isNewUser ? '1' : '0');
        } else {
          document.getElementById('result').innerHTML = '<div class="success"><h2>Ошибка</h2><p>' + (data.error || 'Неизвестная ошибка') + '</p></div>';
        }
      })
      .catch(err => {
        document.getElementById('result').innerHTML = '<div class="success"><h2>Ошибка</h2><p>' + err.message + '</p></div>';
      });
    }
  </script>
  <script async src="https://telegram.org/js/telegram-widget.js?22"
    data-telegram-login="${botName}"
    data-size="large"
    data-radius="12"
    data-onauth="onTelegramAuth(user)"
    data-request-access="write">
  </script>
</body>
</html>`;

    reply.type('text/html').send(html);
  });

  // Link phone number to existing account (request code)
  app.post('/api/auth/link-phone/request', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { phone } = request.body as { phone: string };
    if (!phone || phone.length < 10) {
      return reply.code(400).send({ error: 'Invalid phone number' });
    }

    // Phone may belong to another user — we'll merge accounts on verify

    // Rate limit
    const recentCode = await SmsCode.findOne({
      phone,
      createdAt: { $gt: new Date(Date.now() - 60_000) },
    });
    if (recentCode) {
      return reply.code(429).send({ error: 'Wait 60 seconds before requesting a new code' });
    }

    const generatedCode = generateOtp();

    try {
      const actualCode = await sendCode(phone, generatedCode);
      await SmsCode.findOneAndUpdate(
        { phone },
        { phone, codeHash: hashOtp(actualCode), attempts: 0, expiresAt: new Date(Date.now() + 5 * 60_000) },
        { upsert: true }
      );
    } catch (err: any) {
      app.log.error({ err, msg: 'SMS send failed (link-phone)' });
      return reply.code(502).send({ error: 'Не удалось отправить SMS. Попробуйте позже.' });
    }
    return { message: 'Code sent' };
  });

  // Link phone number to existing account (verify code)
  app.post('/api/auth/link-phone/verify', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { phone, code } = request.body as { phone: string; code: string };

    const smsCode = await SmsCode.findOne({ phone });
    if (!smsCode) {
      return reply.code(400).send({ error: 'No code requested' });
    }
    if (smsCode.expiresAt < new Date()) {
      await SmsCode.deleteOne({ _id: smsCode._id });
      return reply.code(400).send({ error: 'Code expired' });
    }
    if (smsCode.codeHash !== hashOtp(code)) {
      smsCode.attempts += 1;
      await smsCode.save();
      return reply.code(400).send({ error: 'Invalid code' });
    }

    await SmsCode.deleteOne({ _id: smsCode._id });

    // Check if phone belongs to another user — merge accounts if so
    const phoneUser = await User.findOne({ phone });
    if (phoneUser && phoneUser._id.toString() !== request.userId) {
      const oldId = phoneUser._id;
      const newId = request.userId;
      app.log.info(`Merging user ${oldId} into ${newId} (phone: ${phone})`);

      // Transfer all conversations — replace old user in participants
      await Conversation.updateMany(
        { participants: oldId },
        { $addToSet: { participants: newId } }
      );
      await Conversation.updateMany(
        { participants: oldId },
        { $pull: { participants: oldId } }
      );

      // Transfer all messages
      await Message.updateMany(
        { senderId: oldId },
        { senderId: newId }
      );

      // Transfer contacts
      const { Contact } = await import('../models/Contact');
      await Contact.updateMany({ userId: oldId }, { userId: newId }).catch(() => {});
      await Contact.updateMany({ contactUserId: oldId }, { contactUserId: newId }).catch(() => {});

      // Delete old user
      await Session.deleteMany({ userId: oldId.toString() });
      await User.findByIdAndDelete(oldId);
    }

    // Link phone to current user
    await User.findByIdAndUpdate(request.userId, { phone });

    const user = await User.findById(request.userId);
    return {
      success: true,
      user: {
        id: user!._id.toString(),
        phone: user!.phone,
        displayName: user!.displayName,
        avatarUrl: user!.avatarUrl,
      },
    };
  });

  // ─── Register (phone only — send code, do NOT create user) ─────────
  app.post('/api/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if phone already taken (allow if user has no password — incomplete old registration)
    const existingPhone = await User.findOne({ phone: body.phone });
    if (existingPhone && existingPhone.passwordHash) {
      return reply.code(409).send({ error: 'Этот номер телефона уже зарегистрирован' });
    }

    // Send verification call (NumCheckAPI flash call)
    await SmsCode.deleteMany({ phone: body.phone });

    const generatedCode = generateOtp();
    try {
      const actualCode = await sendCode(body.phone, generatedCode);
      await SmsCode.create({
        phone: body.phone,
        codeHash: hashOtp(actualCode),
        expiresAt: new Date(Date.now() + 5 * 60_000),
      });
    } catch (err: any) {
      app.log.error({ err, msg: 'SMS send failed (register)' });
      return reply.code(502).send({ error: 'Не удалось отправить код. Попробуйте позже.' });
    }

    return { success: true };
  });

  // ─── Verify phone after registration (do NOT create user yet) ──────
  app.post('/api/auth/register/verify-phone', async (request, reply) => {
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

    return { success: true, verified: true };
  });

  // ─── Set password after registration (create account) ──────────────
  app.post('/api/auth/register/set-password', async (request, reply) => {
    const body = registerSetPasswordSchema.parse(request.body);

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // If user exists without password (incomplete old registration), update it
    let user = await User.findOne({ phone: body.phone });
    if (user && user.passwordHash) {
      return reply.code(409).send({ error: 'Этот номер телефона уже зарегистрирован' });
    }

    if (user) {
      user.passwordHash = passwordHash;
      user.emailVerified = false;
      await user.save();
    } else {
      user = await User.create({
        phone: body.phone,
        passwordHash,
        emailVerified: false,
        displayName: body.phone,
        rssFeedId: crypto.randomUUID(),
      });
    }

    // Issue tokens
    const userId = user._id.toString();
    const accessToken = await signAccessToken(userId, user.phone || '');
    const refreshToken = await signRefreshToken(userId);

    { const di = getDeviceInfo(request);
    await Session.create({
      userId: user._id,
      deviceId: crypto.randomUUID(),
      refreshTokenHash: hashToken(refreshToken),
      deviceName: di.deviceName,
      ip: di.ip,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    }); }

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        phone: user.phone,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isNewUser: true,
      },
    };
  });

  // ─── Link email to account (send verification email) ─────────────
  app.post('/api/auth/link-email', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { email } = request.body as { email?: string };
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ error: 'Введите корректный email' });
    }

    // Check if email already taken by another user
    const existing = await User.findOne({ email, _id: { $ne: request.userId } });
    if (existing) {
      return reply.code(409).send({ error: 'Этот email уже привязан к другому аккаунту' });
    }

    // Save email to user (not verified yet)
    await User.findByIdAndUpdate(request.userId, { email, emailVerified: false });

    // Send verification email
    const token = await signEmailVerificationToken(request.userId);
    await sendVerificationEmail(email, token);

    return { success: true };
  });

  // ─── Verify email (GET — user clicks link from email) ──────────────
  app.get('/auth/verify-email', async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.code(400).type('text/html').send('<h1>Неверная ссылка</h1>');
    }

    try {
      const { payload } = await verifyToken(token);
      if (payload.purpose !== 'email-verify') {
        throw new Error('invalid token purpose');
      }

      const userId = payload.sub as string;
      const user = await User.findById(userId);
      if (!user) {
        return reply.code(404).type('text/html').send('<h1>Пользователь не найден</h1>');
      }

      user.emailVerified = true;
      await user.save();

      // Issue tokens so the user is logged in
      const accessToken = await signAccessToken(userId, user.phone || '');
      const refreshToken = await signRefreshToken(userId);

      { const di = getDeviceInfo(request);
      await Session.create({
        userId: user._id,
        deviceId: crypto.randomUUID(),
        refreshTokenHash: hashToken(refreshToken),
        deviceName: di.deviceName,
        ip: di.ip,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
      }); }

      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email подтверждён — FOMO Chat</title>
  <style>
    body {
      background: #0f0f23; color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
    }
    .card {
      background: #1a1a3e; border: 1px solid #5b5bf0; border-radius: 12px;
      padding: 32px; text-align: center; max-width: 360px;
    }
    h1 { color: #7c7cff; margin-bottom: 8px; }
    p { color: #aaa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Email подтверждён!</h1>
    <p>Вы можете вернуться в приложение.</p>
  </div>
  <script>
    // Try deep-linking back to the app
    window.location.href = 'fomochat://auth?token=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&userId=${encodeURIComponent(userId)}&displayName=${encodeURIComponent(user.displayName || '')}';
  </script>
</body>
</html>`;

      return reply.type('text/html').send(html);
    } catch (err: any) {
      app.log.error({ err, msg: 'Email verification failed' });
      return reply.code(400).type('text/html').send('<h1>Ссылка недействительна или истекла</h1>');
    }
  });

  // ─── Login with phone + password ───────────────────────────────────
  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await User.findOne({ phone: body.phone });
    if (!user) {
      return reply.code(401).send({ error: 'Неверный номер телефона или пароль' });
    }

    if (!user.passwordHash) {
      return reply.code(400).send({ error: 'Пароль не задан, войдите через код и задайте пароль' });
    }

    const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordValid) {
      return reply.code(401).send({ error: 'Неверный номер телефона или пароль' });
    }

    // Issue tokens
    const userId = user._id.toString();
    const accessToken = await signAccessToken(userId, user.phone || '');
    const refreshToken = await signRefreshToken(userId);

    { const di = getDeviceInfo(request);
    await Session.create({
      userId: user._id,
      deviceId: crypto.randomUUID(),
      refreshTokenHash: hashToken(refreshToken),
      deviceName: di.deviceName,
      ip: di.ip,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    }); }

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        phone: user.phone,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isNewUser: false,
      },
    };
  });

  // ─── Set password (authenticated) ──────────────────────────────────
  app.post('/api/auth/set-password', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = setPasswordSchema.parse(request.body);

    const passwordHash = await bcrypt.hash(body.password, 12);
    await User.findByIdAndUpdate(request.userId, { passwordHash });

    return { success: true };
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

      const newAccessToken = await signAccessToken(userId, user.phone || '');
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
