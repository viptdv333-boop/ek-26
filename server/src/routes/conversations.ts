import { FastifyInstance } from 'fastify';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
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
        phone: p.phone,
      })),
      groupMeta: c.groupMeta
        ? {
            name: c.groupMeta.name,
            avatarUrl: c.groupMeta.avatarUrl,
            admins: c.groupMeta.admins.map((a: any) => a.toString()),
            createdBy: c.groupMeta.createdBy.toString(),
          }
        : null,
      lastMessage: c.lastMessage,
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
    const existing = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userId, otherId], $size: 2 },
    });
    if (existing) {
      return { id: existing._id.toString(), existing: true };
    }

    // Verify other user exists
    const otherUser = await User.findById(otherId);
    if (!otherUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const conversation = await Conversation.create({
      type: 'direct',
      participants: [userId, otherId],
    });

    return { id: conversation._id.toString(), existing: false };
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
}
