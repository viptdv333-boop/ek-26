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

      const senderPopulated = m.senderId && typeof m.senderId === 'object' && (m.senderId as any)._id;
      return {
        id: m._id.toString(),
        conversationId: m.conversationId.toString(),
        sender: senderPopulated ? {
          id: (m.senderId as any)._id.toString(),
          displayName: (m.senderId as any).displayName,
          avatarUrl: (m.senderId as any).avatarUrl,
        } : {
          id: m.senderId?.toString() || 'ai-bot',
          displayName: 'FOMO AI',
          avatarUrl: null,
        },
        type: m.type,
        text: m.text,
        encrypted: !!m.encryptedPayload,
        envelope: m.encryptedPayload ? m.encryptedPayload.toString('utf8') : null,
        attachments: m.attachments,
        replyToId: m.replyToId?.toString() || null,
        replyTo,
        forwardedFrom: (m as any).forwardedFrom || null,
        reactions: (m.reactions || []).map((r: any) => ({ emoji: r.emoji, userId: r.userId.toString() })),
        callData: (m as any).callData || null,
        status: m.status,
        deliveredVia: m.deliveredVia,
        createdAt: m.createdAt.toISOString(),
      };
    });
  });

  // Send message via HTTP (fallback, primary path is WebSocket)
  app.post('/api/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { type = 'text', text, replyToId, encrypted, envelope, attachments } = request.body as {
      type?: string;
      text?: string;
      replyToId?: string;
      encrypted?: boolean;
      envelope?: string;
      attachments?: Array<{ fileId: string; fileName: string; mimeType: string; size: number; url: string }>;
    };

    const isEncrypted = !!(encrypted && envelope);
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!isEncrypted && !text?.trim() && !hasAttachments) {
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
        text: text?.trim() || '',
        attachments: hasAttachments ? attachments : [],
        replyToId: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
        deliveredVia: 'ws',
      });

      const lastText = hasAttachments
        ? (type === 'voice' ? '🎤 Голосовое' : '📎 Файл')
        : text!.trim().slice(0, 100);
      conversation.lastMessage = {
        text: lastText,
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
        attachments: message.attachments || [],
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

  // Toggle reaction on message
  const ALLOWED_REACTIONS = ['👍','❤️','😂','😮','😢','🔥','👎','🎉'];
  app.post('/api/messages/:msgId/reactions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { msgId } = request.params as { msgId: string };
    const { emoji } = request.body as { emoji: string };

    if (!ALLOWED_REACTIONS.includes(emoji)) return reply.code(400).send({ error: 'Invalid reaction' });

    const message = await Message.findById(msgId);
    if (!message) return reply.code(404).send({ error: 'Message not found' });

    const userId = new mongoose.Types.ObjectId(request.userId);
    const existing = (message.reactions || []).findIndex(
      (r: any) => r.emoji === emoji && r.userId.toString() === request.userId
    );

    if (existing >= 0) {
      message.reactions.splice(existing, 1);
    } else {
      if (!message.reactions) message.reactions = [];
      message.reactions.push({ emoji, userId });
    }
    await message.save();

    const reactions = message.reactions.map((r: any) => ({ emoji: r.emoji, userId: r.userId.toString() }));

    broadcastToConversation(message.conversationId.toString(), 'reaction:updated', {
      messageId: msgId,
      reactions,
    });

    return { reactions };
  });

  // Pin message (add to pinned list)
  app.post('/api/conversations/:convId/pin', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { convId } = request.params as { convId: string };
    const { messageId } = request.body as { messageId: string };

    const conv = await Conversation.findById(convId);
    if (!conv) return reply.code(404).send({ error: 'Conversation not found' });

    const msg = await Message.findById(messageId).populate('senderId', 'displayName');
    if (!msg) return reply.code(404).send({ error: 'Message not found' });

    // Check if already pinned
    const already = (conv.pinnedMessages || []).some(
      (p: any) => p.messageId.toString() === messageId
    );
    if (already) return reply.code(409).send({ error: 'Already pinned' });

    conv.pinnedMessages = conv.pinnedMessages || [];
    conv.pinnedMessages.push({
      messageId: new mongoose.Types.ObjectId(messageId),
      pinnedBy: new mongoose.Types.ObjectId(request.userId),
      pinnedAt: new Date(),
    });
    await conv.save();

    broadcastToConversation(convId, 'message:pinned', {
      conversationId: convId,
      messageId,
      text: msg.text,
      senderName: (msg.senderId as any).displayName,
    });

    return { success: true };
  });

  // Unpin message (remove from pinned list)
  app.delete('/api/conversations/:convId/pin/:messageId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { convId, messageId } = request.params as { convId: string; messageId: string };

    const conv = await Conversation.findById(convId);
    if (!conv) return reply.code(404).send({ error: 'Conversation not found' });

    conv.pinnedMessages = (conv.pinnedMessages || []).filter(
      (p: any) => p.messageId.toString() !== messageId
    );
    await conv.save();

    broadcastToConversation(convId, 'message:unpinned', {
      conversationId: convId,
      messageId,
    });

    return { success: true };
  });

  // Full-text search across all user's conversations
  app.get('/api/messages/search', { preHandler: [app.authenticate] }, async (request) => {
    const { q, limit = 30 } = request.query as { q?: string; limit?: number };
    if (!q || q.length < 2) return { results: [] };

    // Get user's conversations with names
    const convs = await Conversation.find({ participants: new mongoose.Types.ObjectId(request.userId) })
      .select('_id type groupMeta participants')
      .populate('participants', 'displayName')
      .lean();
    const convIds = convs.map((c) => c._id);
    const convMap = new Map<string, string>();
    for (const c of convs) {
      if (c.type === 'group' && (c as any).groupMeta?.name) {
        convMap.set(c._id.toString(), (c as any).groupMeta.name);
      } else {
        const other = (c.participants as any[])?.find((p: any) => p._id?.toString() !== request.userId);
        convMap.set(c._id.toString(), other?.displayName || 'Чат');
      }
    }

    const messages = await Message.find({
      conversationId: { $in: convIds },
      text: { $regex: q, $options: 'i' },
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('senderId', 'displayName')
      .lean();

    return {
      results: messages.map((m) => ({
        messageId: m._id.toString(),
        conversationId: m.conversationId.toString(),
        conversationName: convMap.get(m.conversationId.toString()) || 'Чат',
        text: m.text,
        senderName: (m.senderId as any)?.displayName || 'Пользователь',
        createdAt: m.createdAt.toISOString(),
      })),
    };
  });

  // Get all pinned messages
  app.get('/api/conversations/:convId/pin', { preHandler: [app.authenticate] }, async (request) => {
    const { convId } = request.params as { convId: string };
    const conv = await Conversation.findById(convId);
    if (!conv || !conv.pinnedMessages?.length) return { pinned: [] };

    const msgIds = conv.pinnedMessages.map((p: any) => p.messageId);
    const msgs = await Message.find({ _id: { $in: msgIds } }).populate('senderId', 'displayName').lean();

    const pinMap = new Map(conv.pinnedMessages.map((p: any) => [p.messageId.toString(), p]));

    return {
      pinned: msgs.map((m) => ({
        id: m._id.toString(),
        text: m.text,
        senderName: (m.senderId as any).displayName,
        pinnedAt: (pinMap.get(m._id.toString()) as any)?.pinnedAt?.toISOString(),
      })).sort((a: any, b: any) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()),
    };
  });
}
