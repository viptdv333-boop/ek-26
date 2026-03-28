import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { config } from '../config';
import { Settings, getSmsSettings, invalidateSmsCache, ISmsSettings } from '../models/Settings';
import { sendCode, generateOtp } from '../services/sms';
import * as fs from 'fs';
import * as path from 'path';

// Get directory size recursively
async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirSize(fullPath);
      } else {
        const stat = await fs.promises.stat(fullPath);
        total += stat.size;
      }
    }
  } catch {
    // dir doesn't exist
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function adminRoutes(app: FastifyInstance) {
  const preHandler = [authMiddleware, adminMiddleware];

  // Dashboard stats
  app.get('/api/admin/stats', { preHandler }, async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersWeek,
      newUsersMonth,
      totalMessages,
      messagesToday,
      messagesWeek,
      totalConversations,
      directConversations,
      groupConversations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ createdAt: { $gte: monthAgo } }),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: today } }),
      Message.countDocuments({ createdAt: { $gte: weekAgo } }),
      Conversation.countDocuments(),
      Conversation.countDocuments({ type: 'direct' }),
      Conversation.countDocuments({ type: 'group' }),
    ]);

    // Disk usage
    const uploadsSize = await getDirSize(config.UPLOADS_DIR);

    // DB stats
    let dbSize = 0;
    try {
      const dbStats = await User.db.db!.stats();
      dbSize = dbStats.dataSize + dbStats.indexSize;
    } catch { /* ignore */ }

    // Recently active (last 5 min)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const onlineUsers = await User.countDocuments({ lastSeen: { $gte: fiveMinAgo } });

    return {
      users: {
        total: totalUsers,
        online: onlineUsers,
        newWeek: newUsersWeek,
        newMonth: newUsersMonth,
      },
      messages: {
        total: totalMessages,
        today: messagesToday,
        week: messagesWeek,
      },
      conversations: {
        total: totalConversations,
        direct: directConversations,
        group: groupConversations,
      },
      disk: {
        uploadsBytes: uploadsSize,
        uploads: formatBytes(uploadsSize),
        dbBytes: dbSize,
        db: formatBytes(dbSize),
      },
    };
  });

  // Users list
  app.get('/api/admin/users', { preHandler }, async (request) => {
    const { search, sort = 'createdAt', order = 'desc' } = request.query as {
      search?: string;
      sort?: string;
      order?: string;
    };

    const filter: any = {};
    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('phone displayName avatarUrl email lastSeen isAdmin createdAt')
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .lean();

    // Get message counts per user
    const messageCounts = await Message.aggregate([
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
    ]);
    const msgMap = new Map(messageCounts.map((m: any) => [m._id.toString(), m.count]));

    // Get conversation counts per user
    const convCounts = await Conversation.aggregate([
      { $unwind: '$participants' },
      { $group: { _id: '$participants', count: { $sum: 1 } } },
    ]);
    const convMap = new Map(convCounts.map((c: any) => [c._id.toString(), c.count]));

    return users.map((u: any) => ({
      id: u._id.toString(),
      phone: u.phone,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      email: u.email,
      lastSeen: u.lastSeen,
      isAdmin: u.isAdmin || false,
      createdAt: u.createdAt,
      messageCount: msgMap.get(u._id.toString()) || 0,
      conversationCount: convMap.get(u._id.toString()) || 0,
    }));
  });

  // User details
  app.get('/api/admin/users/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await User.findById(id)
      .select('phone displayName avatarUrl email lastSeen isAdmin status fcmTokens createdAt')
      .lean();

    if (!user) return reply.code(404).send({ error: 'User not found' });

    const messageCount = await Message.countDocuments({ senderId: id });
    const conversations = await Conversation.find({ participants: id })
      .select('type groupMeta.name participants lastMessage createdAt')
      .lean();

    // Files uploaded by user (count messages with attachments)
    const fileMessages = await Message.find({
      senderId: id,
      'attachments.0': { $exists: true },
    }).select('attachments').lean();

    let totalFileSize = 0;
    let fileCount = 0;
    for (const msg of fileMessages) {
      for (const att of (msg as any).attachments || []) {
        fileCount++;
        totalFileSize += att.size || 0;
      }
    }

    return {
      id: (user as any)._id.toString(),
      phone: user.phone,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      status: user.status,
      lastSeen: user.lastSeen,
      isAdmin: user.isAdmin || false,
      pushTokens: (user.fcmTokens || []).length,
      createdAt: (user as any).createdAt,
      messageCount,
      conversationCount: conversations.length,
      fileCount,
      totalFileSize: formatBytes(totalFileSize),
      conversations: conversations.map((c: any) => ({
        id: c._id.toString(),
        type: c.type,
        name: c.groupMeta?.name || null,
        participantCount: c.participants.length,
        lastMessageAt: c.lastMessage?.timestamp || c.createdAt,
      })),
    };
  });

  // Update user (admin actions)
  app.patch('/api/admin/users/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isAdmin, blocked } = request.body as { isAdmin?: boolean; blocked?: boolean };

    const user = await User.findById(id);
    if (!user) return reply.code(404).send({ error: 'User not found' });

    if (typeof isAdmin === 'boolean') {
      user.isAdmin = isAdmin;
    }

    await user.save();

    return { success: true };
  });

  // Disk details
  app.get('/api/admin/disk', { preHandler }, async () => {
    const uploadsDir = config.UPLOADS_DIR;
    let totalSize = 0;
    let fileCount = 0;
    const byType: Record<string, { count: number; size: number }> = {};

    try {
      const uuidDirs = await fs.promises.readdir(uploadsDir);
      for (const uuid of uuidDirs) {
        const uuidPath = path.join(uploadsDir, uuid);
        const stat = await fs.promises.stat(uuidPath);
        if (!stat.isDirectory()) continue;

        const files = await fs.promises.readdir(uuidPath);
        for (const file of files) {
          const fileStat = await fs.promises.stat(path.join(uuidPath, file));
          const ext = path.extname(file).toLowerCase() || 'unknown';
          totalSize += fileStat.size;
          fileCount++;

          if (!byType[ext]) byType[ext] = { count: 0, size: 0 };
          byType[ext].count++;
          byType[ext].size += fileStat.size;
        }
      }
    } catch { /* uploads dir may not exist */ }

    return {
      totalSize: formatBytes(totalSize),
      totalSizeBytes: totalSize,
      fileCount,
      byType: Object.entries(byType)
        .sort((a, b) => b[1].size - a[1].size)
        .map(([ext, data]) => ({
          extension: ext,
          count: data.count,
          size: formatBytes(data.size),
          sizeBytes: data.size,
        })),
    };
  });

  // ── SMS Provider Settings ──────────────────────────────────────

  // Get SMS settings
  app.get('/api/admin/sms', { preHandler }, async () => {
    const settings = await getSmsSettings();
    // Mask credentials
    return {
      activeProvider: settings.activeProvider,
      numcheckToken: settings.numcheckToken ? '***' + settings.numcheckToken.slice(-4) : '',
      ucallerServiceId: settings.ucallerServiceId || '',
      ucallerSecretKey: settings.ucallerSecretKey ? '***' + settings.ucallerSecretKey.slice(-4) : '',
      alibabaAccessKeyId: settings.alibabaAccessKeyId || '',
      alibabaAccessKeySecret: settings.alibabaAccessKeySecret ? '***' + settings.alibabaAccessKeySecret.slice(-4) : '',
      alibabaSignName: settings.alibabaSignName || '',
      alibabaTemplateCode: settings.alibabaTemplateCode || '',
      twilioAccountSid: settings.twilioAccountSid || '',
      twilioAuthToken: settings.twilioAuthToken ? '***' + settings.twilioAuthToken.slice(-4) : '',
      twilioPhoneNumber: settings.twilioPhoneNumber || '',
    };
  });

  // Update SMS settings
  app.patch('/api/admin/sms', { preHandler }, async (request) => {
    const body = request.body as Partial<ISmsSettings>;
    const current = await getSmsSettings();

    const update: Partial<ISmsSettings> = {};
    if (body.activeProvider && ['numcheck', 'ucaller', 'alibaba', 'twilio', 'dev'].includes(body.activeProvider)) {
      update.activeProvider = body.activeProvider;
    }
    if (typeof body.numcheckToken === 'string') {
      update.numcheckToken = body.numcheckToken;
    }
    if (typeof body.ucallerServiceId === 'string') {
      update.ucallerServiceId = body.ucallerServiceId;
    }
    if (typeof body.ucallerSecretKey === 'string') {
      update.ucallerSecretKey = body.ucallerSecretKey;
    }
    if (typeof body.alibabaAccessKeyId === 'string') {
      update.alibabaAccessKeyId = body.alibabaAccessKeyId;
    }
    if (typeof body.alibabaAccessKeySecret === 'string') {
      update.alibabaAccessKeySecret = body.alibabaAccessKeySecret;
    }
    if (typeof body.alibabaSignName === 'string') {
      update.alibabaSignName = body.alibabaSignName;
    }
    if (typeof body.alibabaTemplateCode === 'string') {
      update.alibabaTemplateCode = body.alibabaTemplateCode;
    }
    if (typeof body.twilioAccountSid === 'string') {
      update.twilioAccountSid = body.twilioAccountSid;
    }
    if (typeof body.twilioAuthToken === 'string') {
      update.twilioAuthToken = body.twilioAuthToken;
    }
    if (typeof body.twilioPhoneNumber === 'string') {
      update.twilioPhoneNumber = body.twilioPhoneNumber;
    }

    await Settings.updateOne(
      { key: 'sms' },
      { $set: { value: { ...current, ...update } } },
      { upsert: true }
    );
    invalidateSmsCache();

    return { success: true };
  });

  // Test SMS — send a code to a phone number
  app.post('/api/admin/sms/test', { preHandler }, async (request, reply) => {
    const { phone } = request.body as { phone: string };
    if (!phone) return reply.code(400).send({ error: 'Phone required' });

    try {
      const code = await generateOtp();
      const actualCode = await sendCode(phone, code);
      return { success: true, code: actualCode, message: `Code sent to ${phone}` };
    } catch (err: any) {
      return reply.code(502).send({ error: err.message || 'Send failed' });
    }
  });
}
