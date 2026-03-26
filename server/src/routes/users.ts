import { FastifyInstance } from 'fastify';
import { User } from '../models/User';

function getDevicePlatform(ua: string): string {
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

export async function userRoutes(app: FastifyInstance) {
  // Get current user profile
  app.get('/api/users/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await User.findById(request.userId).select('-identityKeyPublic -signedPreKey -oneTimePreKeys -fcmTokens -apnsTokens');
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      id: user._id.toString(),
      phone: user.phone,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      status: user.status,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    };
  });

  // Update profile
  app.patch('/api/users/me', { preHandler: [app.authenticate] }, async (request) => {
    const { displayName, avatarUrl, email, status } = request.body as {
      displayName?: string;
      avatarUrl?: string | null;
      email?: string | null;
      status?: string;
    };

    const update: Record<string, unknown> = {};
    if (displayName !== undefined) update.displayName = displayName;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (email !== undefined) update.email = email;
    if (status !== undefined) update.status = status;

    const user = await User.findByIdAndUpdate(request.userId, update, { new: true })
      .select('-identityKeyPublic -signedPreKey -oneTimePreKeys -fcmTokens -apnsTokens');
    return {
      id: user!._id.toString(),
      phone: user!.phone,
      displayName: user!.displayName,
      avatarUrl: user!.avatarUrl,
      email: (user as any).email,
      status: user!.status,
    };
  });

  // Get another user's profile
  app.get('/api/users/:id/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await User.findById(id).select('displayName avatarUrl status lastSeen');
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return {
      id: user._id.toString(),
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastSeen: user.lastSeen,
    };
  });

  // Lookup users by phone numbers (contact discovery)
  app.post('/api/users/lookup', { preHandler: [app.authenticate] }, async (request) => {
    const { phones } = request.body as { phones: string[] };
    const users = await User.find({ phone: { $in: phones } })
      .select('phone displayName avatarUrl status');
    return users.map((u) => ({
      id: u._id.toString(),
      phone: u.phone,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      status: u.status,
    }));
  });

  // Search users by query (phone, username, or displayName)
  app.get('/api/users/search', { preHandler: [app.authenticate] }, async (request) => {
    const { q } = request.query as { q?: string };
    if (!q || q.length < 2) {
      return [];
    }

    const isPhone = /^\+?\d/.test(q);
    const filter: Record<string, unknown> = { _id: { $ne: request.userId } };

    if (isPhone) {
      // Escape + for regex, clean non-digit chars
      const cleanPhone = q.replace(/[^+\d]/g, '').replace(/\+/g, '\\+');
      filter.phone = { $regex: cleanPhone, $options: 'i' };
    } else {
      filter.$or = [
        { displayName: { $regex: q, $options: 'i' } },
        { telegramUsername: { $regex: q, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('phone displayName avatarUrl status telegramUsername')
      .limit(20);

    return users.map((u) => ({
      id: u._id.toString(),
      phone: u.phone,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      telegramUsername: u.telegramUsername,
    }));
  });

  // Lookup single user by phone
  app.get('/api/users/lookup/:phone', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { phone } = request.params as { phone: string };
    const user = await User.findOne({ phone }).select('phone displayName avatarUrl status');
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return {
      id: user._id.toString(),
      phone: user.phone,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  });

  // Register push token
  app.post('/api/users/me/push-token', { preHandler: [app.authenticate] }, async (request) => {
    const { token, platform } = request.body as { token: string; platform: 'fcm' | 'apns' };
    const field = platform === 'fcm' ? 'fcmTokens' : 'apnsTokens';
    await User.findByIdAndUpdate(request.userId, { $addToSet: { [field]: token } });
    return { success: true };
  });

  // ── Device / Session management ─────────────────────────────────
  app.get('/api/users/me/sessions', { preHandler: [app.authenticate] }, async (request) => {
    const { Session } = await import('../models/Session.js');
    const sessions = await Session.find({ userId: request.userId })
      .sort({ lastActiveAt: -1 })
      .select('deviceId deviceName ip lastActiveAt createdAt')
      .lean();

    const requestIp = ((request.headers as any)['x-real-ip'] || (request.headers as any)['x-forwarded-for'] || request.ip || '').split(',')[0].trim();
    const ua = (request.headers as any)['user-agent'] || '';

    return sessions.map((s, i) => {
      // Match current session: same IP prefix in stored ip field + same device type
      const storedIp = (s.ip || '').split(' ·')[0].trim();
      const isCurrent = storedIp === requestIp && (s.deviceName || '').split(' ')[0] === getDevicePlatform(ua);
      return {
        id: s._id.toString(),
        deviceId: s.deviceId,
        deviceName: s.deviceName || 'Unknown device',
        ip: s.ip || '',
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        isCurrent: isCurrent || (i === 0 && !sessions.some((ss, j) => j !== i && (ss.ip || '').startsWith(requestIp))),
      };
    });
  });

  app.delete('/api/users/me/sessions/:sessionId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { Session } = await import('../models/Session.js');
    const result = await Session.deleteOne({ _id: sessionId, userId: request.userId });
    if (result.deletedCount === 0) {
      return reply.code(404).send({ error: 'Session not found' });
    }
    return { success: true };
  });
}
