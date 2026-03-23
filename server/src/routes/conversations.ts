import { FastifyInstance } from 'fastify';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import { sendToUser } from '../ws/handler';
import mongoose from 'mongoose';

export async function conversationRoutes(app: FastifyInstance) {
  // List conversations for current user
  app.get('/api/conversations', { preHandler: [app.authenticate] }, async (request) => {
    const { cursor, limit = 20 } = request.query as { cursor?: string; limit?: number };
    const userId = new mongoose.Types.ObjectId(request.userId);

    const query: Record<string, unknown> = { participants: userId };
    if (cursor) {
      query.updatedAt = { $lt: new Date(cursor) };
    }

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .populate('participants', 'displayName avatarUrl phone')
      .lean();

    return conversations.map((c) => ({
      id: c._id.toString(),
      type: c.type,
      participants: (c.participants as any[]).map((p: any) => ({
        id: p._id.toString(),
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      })),
      groupMeta: c.groupMeta
        ? {
            name: c.groupMeta.name,
            avatarUrl: c.groupMeta.avatarUrl,
            admins: c.groupMeta.admins.map((a: any) => a.toString()),
            createdBy: c.groupMeta.createdBy.toString(),
          }
        : null,
      lastMessage: c.lastMessage
        ? {
            text: c.lastMessage.text,
            senderId: c.lastMessage.senderName || '',
            createdAt: c.lastMessage.timestamp?.toISOString() || c.updatedAt.toISOString(),
          }
        : null,
      unreadCount: 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  });

  // Create direct conversation
  app.post('/api/conversations/direct', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { participantId } = request.body as { participantId: string };
    const userId = new mongoose.Types.ObjectId(request.userId);
    const otherId = new mongoose.Types.ObjectId(participantId);

    // Check if direct conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userId, otherId], $size: 2 },
    });

    if (!conversation) {
      // Verify other user exists
      const otherUser = await User.findById(otherId);
      if (!otherUser) {
        return reply.code(404).send({ error: 'User not found' });
      }
      conversation = await Conversation.create({
        type: 'direct',
        participants: [userId, otherId],
      });
    }

    // Return populated conversation
    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'displayName avatarUrl phone')
      .lean();

    const convData = {
      id: populated!._id.toString(),
      type: populated!.type,
      participants: (populated!.participants as any[]).map((p: any) => ({
        id: p._id.toString(),
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      })),
      groupMeta: null,
      lastMessage: null,
      unreadCount: 0,
      createdAt: populated!.createdAt.toISOString(),
      updatedAt: populated!.updatedAt.toISOString(),
    };

    // Notify other participant via WebSocket so chat appears in their sidebar
    sendToUser(participantId, 'conversation:new', convData);

    return convData;
  });

  // Create group conversation
  app.post('/api/conversations/group', { preHandler: [app.authenticate] }, async (request) => {
    const { name, participantIds } = request.body as { name: string; participantIds: string[] };
    const userId = new mongoose.Types.ObjectId(request.userId);

    const allParticipants = [
      userId,
      ...participantIds.map((id) => new mongoose.Types.ObjectId(id)),
    ];

    const conversation = await Conversation.create({
      type: 'group',
      participants: allParticipants,
      groupMeta: {
        name,
        avatarUrl: null,
        admins: [userId],
        createdBy: userId,
      },
    });

    return { id: conversation._id.toString() };
  });

  // Get conversation details
  app.get('/api/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const conversation = await Conversation.findById(id)
      .populate('participants', 'displayName avatarUrl phone status lastSeen')
      .lean();

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === request.userId
    );
    if (!isParticipant) {
      return reply.code(403).send({ error: 'Not a participant' });
    }

    return {
      id: conversation._id.toString(),
      type: conversation.type,
      participants: (conversation.participants as any[]).map((p: any) => ({
        id: p._id.toString(),
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        phone: p.phone,
        status: p.status,
        lastSeen: p.lastSeen,
      })),
      groupMeta: conversation.groupMeta,
      lastMessage: conversation.lastMessage,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  });

  // Delete conversation (leave / remove)
  app.delete('/api/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userId!;

      const conv = await Conversation.findById(id);
      if (!conv) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      const isParticipant = conv.participants.some((p: any) => {
        const pid = p._id ? p._id.toString() : p.toString();
        return pid === userId;
      });
      if (!isParticipant) {
        return reply.code(403).send({ error: 'Not a participant' });
      }

      // For direct chats — delete entirely for this user
      // For now, delete conversation and all messages
      const { Message } = await import('../models/Message');
      await Message.deleteMany({ conversationId: new mongoose.Types.ObjectId(id) });
      await Conversation.findByIdAndDelete(id);

      return { success: true };
    } catch (err) {
      request.log.error(err, 'Delete conversation failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update group (admin only)
  app.patch('/api/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, avatarUrl } = request.body as { name?: string; avatarUrl?: string | null };

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const isAdmin = conversation.groupMeta?.admins.some(
      (a) => a.toString() === request.userId
    );
    if (!isAdmin) {
      return reply.code(403).send({ error: 'Not an admin' });
    }

    if (name) conversation.groupMeta!.name = name;
    if (avatarUrl !== undefined) conversation.groupMeta!.avatarUrl = avatarUrl;
    await conversation.save();

    return { success: true };
  });

  // Add members to group
  app.post('/api/conversations/:id/members', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userIds } = request.body as { userIds: string[] };

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const isAdmin = conversation.groupMeta?.admins.some(
      (a) => a.toString() === request.userId
    );
    if (!isAdmin) {
      return reply.code(403).send({ error: 'Not an admin' });
    }

    const newIds = userIds.map((uid) => new mongoose.Types.ObjectId(uid));
    await Conversation.findByIdAndUpdate(id, {
      $addToSet: { participants: { $each: newIds } },
    });

    return { success: true };
  });

  // Remove member from group
  app.delete('/api/conversations/:id/members/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const isAdmin = conversation.groupMeta?.admins.some(
      (a) => a.toString() === request.userId
    );
    const isSelf = targetUserId === request.userId;

    if (!isAdmin && !isSelf) {
      return reply.code(403).send({ error: 'Not authorized' });
    }

    await Conversation.findByIdAndUpdate(id, {
      $pull: { participants: new mongoose.Types.ObjectId(targetUserId) },
    });

    return { success: true };
  });

  // Toggle mute conversation
  app.patch('/api/conversations/:id/mute', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const conv = await Conversation.findById(id);
    if (!conv) return reply.code(404).send({ error: 'Not found' });

    const userId = new mongoose.Types.ObjectId(request.userId);
    const isMuted = (conv.mutedBy || []).some((u: any) => u.toString() === request.userId);

    if (isMuted) {
      await Conversation.findByIdAndUpdate(id, { $pull: { mutedBy: userId } });
    } else {
      await Conversation.findByIdAndUpdate(id, { $addToSet: { mutedBy: userId } });
    }
    return { muted: !isMuted };
  });

  // Toggle archive conversation
  app.patch('/api/conversations/:id/archive', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const conv = await Conversation.findById(id);
    if (!conv) return reply.code(404).send({ error: 'Not found' });

    const userId = new mongoose.Types.ObjectId(request.userId);
    const isArchived = (conv.archivedBy || []).some((u: any) => u.toString() === request.userId);

    if (isArchived) {
      await Conversation.findByIdAndUpdate(id, { $pull: { archivedBy: userId } });
    } else {
      await Conversation.findByIdAndUpdate(id, { $addToSet: { archivedBy: userId } });
    }
    return { archived: !isArchived };
  });

  // Block user
  app.post('/api/users/block/:targetId', { preHandler: [app.authenticate] }, async (request) => {
    const { targetId } = request.params as { targetId: string };
    await User.findByIdAndUpdate(request.userId, {
      $addToSet: { blockedUsers: new mongoose.Types.ObjectId(targetId) },
    });
    return { success: true };
  });

  // Unblock user
  app.delete('/api/users/block/:targetId', { preHandler: [app.authenticate] }, async (request) => {
    const { targetId } = request.params as { targetId: string };
    await User.findByIdAndUpdate(request.userId, {
      $pull: { blockedUsers: new mongoose.Types.ObjectId(targetId) },
    });
    return { success: true };
  });

  // Delete own account
  app.delete('/api/users/me', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.userId;
    const { Message } = await import('../models/Message');
    const { Session } = await import('../models/Session');

    // Replace messages with "Аккаунт удалён"
    await Message.updateMany(
      { senderId: new mongoose.Types.ObjectId(userId) },
      { $set: { text: 'Аккаунт удалён', attachments: [], encryptedPayload: null } }
    );

    // Remove from conversations
    await Conversation.updateMany(
      { participants: new mongoose.Types.ObjectId(userId) },
      { $pull: { participants: new mongoose.Types.ObjectId(userId) } }
    );

    // Delete empty conversations (no participants left)
    await Conversation.deleteMany({ participants: { $size: 0 } });

    // Delete sessions and user
    await Session.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
    await User.findByIdAndDelete(userId);

    return { success: true };
  });
}
