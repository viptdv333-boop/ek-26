import { FastifyInstance } from 'fastify';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import mongoose from 'mongoose';

export async function messageRoutes(app: FastifyInstance) {
  // Get messages for a conversation (paginated)
  app.get('/api/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit = 50 } = request.query as { cursor?: string; limit?: number };

    // Verify participation
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === request.userId
    );
    if (!isParticipant) {
      return reply.code(403).send({ error: 'Not a participant' });
    }

    const query: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(id),
    };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('senderId', 'displayName avatarUrl')
      .lean();

    return messages.map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      sender: {
        id: (m.senderId as any)._id.toString(),
        displayName: (m.senderId as any).displayName,
        avatarUrl: (m.senderId as any).avatarUrl,
      },
      type: m.type,
      text: m.text,
      attachments: m.attachments,
      replyToId: m.replyToId?.toString() || null,
      status: m.status,
      deliveredVia: m.deliveredVia,
      createdAt: m.createdAt.toISOString(),
    }));
  });

  // Send message via HTTP (fallback, primary path is WebSocket)
  app.post('/api/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { type = 'text', text, replyToId } = request.body as {
      type?: string;
      text?: string;
      replyToId?: string;
    };

    if (!text?.trim()) {
      return reply.code(400).send({ error: 'Message text required' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === request.userId
    );
    if (!isParticipant) {
      return reply.code(403).send({ error: 'Not a participant' });
    }

    const sender = await User.findById(request.userId).select('displayName');

    const message = await Message.create({
      conversationId: new mongoose.Types.ObjectId(id),
      senderId: new mongoose.Types.ObjectId(request.userId),
      type,
      text: text.trim(),
      replyToId: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
      deliveredVia: 'ws',
    });

    // Update conversation's last message
    conversation.lastMessage = {
      text: text.trim().slice(0, 100),
      senderName: sender!.displayName,
      timestamp: message.createdAt,
    };
    await conversation.save();

    // Broadcast via WebSocket (if connected)
    const messageData = {
      id: message._id.toString(),
      conversationId: id,
      sender: {
        id: request.userId,
        displayName: sender!.displayName,
      },
      type: message.type,
      text: message.text,
      replyToId: message.replyToId?.toString() || null,
      status: 'sent',
      createdAt: message.createdAt.toISOString(),
    };

    try {
      app.broadcastToConversation(id, 'message:new', messageData, request.userId);
    } catch {
      // No WebSocket clients connected — message saved via HTTP
    }

    return messageData;
  });

  // Update message status
  app.patch('/api/conversations/:convId/messages/:msgId', { preHandler: [app.authenticate] }, async (request) => {
    const { msgId } = request.params as { convId: string; msgId: string };
    const { status } = request.body as { status: 'delivered' | 'read' };

    await Message.findByIdAndUpdate(msgId, { status });
    return { success: true };
  });
}
