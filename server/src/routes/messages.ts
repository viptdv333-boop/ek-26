import { FastifyInstance } from 'fastify';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import { broadcastToConversation, sendToUser } from '../ws/handler';
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

    // Collect replyToIds for batch lookup
    const replyToIds = messages.filter(m => m.replyToId).map(m => m.replyToId);
    const repliedMessages = replyToIds.length > 0
      ? await Message.find({ _id: { $in: replyToIds } })
          .populate('senderId', 'displayName')
          .lean()
      : [];
    const replyMap = new Map(repliedMessages.map(m => [m._id.toString(), m]));

    return messages.map((m) => {
      let replyTo = null;
      if (m.replyToId) {
        const replied = replyMap.get(m.replyToId.toString());
        if (replied) {
          replyTo = {
            id: replied._id.toString(),
            text: replied.text,
            senderName: (replied.senderId as any)?.displayName || '',
          };
        }
      }

      return {
        id: m._id.toString(),
        conversationId: m.conversationId.toString(),
        sender: {
          id: (m.senderId as any)._id.toString(),
          displayName: (m.senderId as any).displayName,
          avatarUrl: (m.senderId as any).avatarUrl,
        },
        type: m.type,
        text: m.text,
        encrypted: !!m.encryptedPayload,
        envelope: m.encryptedPayload ? m.encryptedPayload.toString('utf8') : null,
        attachments: m.attachments,
        replyToId: m.replyToId?.toString() || null,
        replyTo,
        forwardedFrom: (m as any).forwardedFrom || null,
        status: m.status,
        deliveredVia: m.deliveredVia,
        createdAt: m.createdAt.toISOString(),
      };
    });
  });

  // Send message via HTTP (fallback, primary path is WebSocket)
  app.post('/api/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { type = 'text', text, replyToId, encrypted, envelope } = request.body as {
      type?: string;
      text?: string;
      replyToId?: string;
      encrypted?: boolean;
      envelope?: string;
    };

    const isEncrypted = !!(encrypted && envelope);

    if (!isEncrypted && !text?.trim()) {
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

    let messageData: Record<string, unknown>;

    if (isEncrypted) {
      const message = await Message.create({
        conversationId: new mongoose.Types.ObjectId(id),
        senderId: new mongoose.Types.ObjectId(request.userId),
        type,
        text: null,
        encryptedPayload: Buffer.from(envelope, 'utf8'),
        deliveredVia: 'ws',
      });

      conversation.lastMessage = {
        text: 'Зашифрованное сообщение',
        senderName: sender!.displayName,
        timestamp: message.createdAt,
      };
      await conversation.save();

      messageData = {
        id: message._id.toString(),
        conversationId: id,
        sender: { id: request.userId, displayName: sender!.displayName },
        type: message.type,
        text: null,
        encrypted: true,
        envelope,
        status: 'sent',
        createdAt: message.createdAt.toISOString(),
      };
    } else {
      const message = await Message.create({
        conversationId: new mongoose.Types.ObjectId(id),
        senderId: new mongoose.Types.ObjectId(request.userId),
        type,
        text: text!.trim(),
        replyToId: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
        deliveredVia: 'ws',
      });

      conversation.lastMessage = {
        text: text!.trim().slice(0, 100),
        senderName: sender!.displayName,
        timestamp: message.createdAt,
      };
      await conversation.save();

      messageData = {
        id: message._id.toString(),
        conversationId: id,
        sender: { id: request.userId, displayName: sender!.displayName },
        type: message.type,
        text: message.text,
        replyToId: message.replyToId?.toString() || null,
        status: 'sent',
        createdAt: message.createdAt.toISOString(),
      };
    }

    // Broadcast via WebSocket (if connected)
    try {
      broadcastToConversation(id, 'message:new', messageData, request.userId);
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

  // Edit message (only own messages)
  app.patch('/api/messages/:msgId/edit', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { msgId } = request.params as { msgId: string };
    const { text } = request.body as { text: string };

    const message = await Message.findById(msgId);
    if (!message) return reply.code(404).send({ error: 'Message not found' });
    if (message.senderId.toString() !== request.userId) {
      return reply.code(403).send({ error: 'Can only edit your own messages' });
    }

    message.text = text.trim();
    message.editedAt = new Date();
    await message.save();

    // Broadcast edit to all participants
    broadcastToConversation(message.conversationId.toString(), 'message:edited', {
      messageId: msgId,
      text: message.text,
      editedAt: message.editedAt.toISOString(),
    });

    return { success: true, text: message.text, editedAt: message.editedAt.toISOString() };
  });

  // Delete message
  app.delete('/api/messages/:msgId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { msgId } = request.params as { msgId: string };

    const message = await Message.findById(msgId);
    if (!message) return reply.code(404).send({ error: 'Message not found' });

    // Soft delete — mark as deleted
    message.text = null;
    message.attachments = [];
    message.deletedAt = new Date();
    await message.save();

    broadcastToConversation(message.conversationId.toString(), 'message:deleted', {
      messageId: msgId,
      conversationId: message.conversationId.toString(),
    });

    return { success: true };
  });

  // Pin/unpin message
  app.post('/api/conversations/:convId/pin', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { convId } = request.params as { convId: string };
    const { messageId } = request.body as { messageId: string | null };

    const conv = await Conversation.findById(convId);
    if (!conv) return reply.code(404).send({ error: 'Conversation not found' });

    if (messageId) {
      const msg = await Message.findById(messageId).populate('senderId', 'displayName');
      if (!msg) return reply.code(404).send({ error: 'Message not found' });

      conv.pinnedMessageId = new mongoose.Types.ObjectId(messageId);
      await conv.save();

      broadcastToConversation(convId, 'message:pinned', {
        conversationId: convId,
        messageId,
        text: msg.text,
        senderName: (msg.senderId as any).displayName,
      });
    } else {
      conv.pinnedMessageId = null;
      await conv.save();

      broadcastToConversation(convId, 'message:unpinned', { conversationId: convId });
    }

    return { success: true };
  });

  // Get pinned message
  app.get('/api/conversations/:convId/pin', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { convId } = request.params as { convId: string };
    const conv = await Conversation.findById(convId);
    if (!conv || !conv.pinnedMessageId) return { pinned: null };

    const msg = await Message.findById(conv.pinnedMessageId).populate('senderId', 'displayName');
    if (!msg) return { pinned: null };

    return {
      pinned: {
        id: msg._id.toString(),
        text: msg.text,
        senderName: (msg.senderId as any).displayName,
      },
    };
  });
}
