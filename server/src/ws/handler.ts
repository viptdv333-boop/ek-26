import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { jwtVerify } from 'jose';
import { config } from '../config';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import mongoose from 'mongoose';

const secret = new TextEncoder().encode(config.JWT_SECRET);

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  conversationIds: Set<string>;
}

// Map: userId -> Set of connected WebSocket clients (multiple devices)
const clients = new Map<string, Set<ConnectedClient>>();
// Map: conversationId -> Set of userIds currently subscribed
const conversationSubscribers = new Map<string, Set<string>>();

export function getOnlineUserIds(): string[] {
  return Array.from(clients.keys());
}

export function broadcastToConversation(
  conversationId: string,
  event: string,
  data: unknown,
  excludeUserId?: string
) {
  const subscribers = conversationSubscribers.get(conversationId);
  if (!subscribers) return;

  const payload = JSON.stringify({ event, data });

  for (const userId of subscribers) {
    if (userId === excludeUserId) continue;
    const userClients = clients.get(userId);
    if (!userClients) continue;
    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }
}

export function sendToUser(userId: string, event: string, data: unknown) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const payload = JSON.stringify({ event, data });
  for (const client of userClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export async function setupWebSocket(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, async (socket, request) => {
    // Authenticate via query param token
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Missing token');
      return;
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, secret);
      userId = payload.sub as string;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    // Register client
    const client: ConnectedClient = {
      ws: socket,
      userId,
      conversationIds: new Set(),
    };

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
      // Broadcast online status
      broadcastOnlineStatus(userId, true);
    }
    clients.get(userId)!.add(client);

    // Auto-subscribe to all user's conversations
    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(userId),
    }).select('_id');

    for (const conv of conversations) {
      const convId = conv._id.toString();
      client.conversationIds.add(convId);
      if (!conversationSubscribers.has(convId)) {
        conversationSubscribers.set(convId, new Set());
      }
      conversationSubscribers.get(convId)!.add(userId);
    }

    // Update last seen
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });

    // Send confirmation + list of online users
    socket.send(JSON.stringify({ event: 'connected', data: { userId } }));

    // Send current online users list
    const onlineIds = getOnlineUserIds().filter(id => id !== userId);
    if (onlineIds.length > 0) {
      socket.send(JSON.stringify({ event: 'online:list', data: { userIds: onlineIds } }));
    }

    // Handle messages
    socket.on('message', async (raw) => {
      try {
        const { event, data } = JSON.parse(raw.toString());
        await handleEvent(app, client, event, data);
      } catch (err) {
        socket.send(JSON.stringify({ event: 'error', data: { message: 'Invalid message format' } }));
      }
    });

    // Handle disconnect
    socket.on('close', async () => {
      const userClients = clients.get(userId);
      if (userClients) {
        userClients.delete(client);
        if (userClients.size === 0) {
          clients.delete(userId);
          broadcastOnlineStatus(userId, false);
          await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        }
      }

      // Clean up conversation subscriptions
      for (const convId of client.conversationIds) {
        const subs = conversationSubscribers.get(convId);
        if (subs) {
          // Only remove if no other connections for this user in this conversation
          const hasOtherConnection = Array.from(clients.get(userId) || []).some(
            (c) => c.conversationIds.has(convId)
          );
          if (!hasOtherConnection) {
            subs.delete(userId);
          }
          if (subs.size === 0) {
            conversationSubscribers.delete(convId);
          }
        }
      }
    });

    // Heartbeat
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }, 15_000);

    socket.on('close', () => clearInterval(pingInterval));
  });
}

async function handleEvent(
  app: FastifyInstance,
  client: ConnectedClient,
  event: string,
  data: any
) {
  switch (event) {
    case 'message:send': {
      const { conversationId, text, type = 'text', replyToId, attachments, forwardedFrom } = data;

      const isEncrypted = !!(data.encrypted && data.envelope);

      // For plaintext messages, text or attachments required; for encrypted, envelope required
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if (!conversationId || (!isEncrypted && !text?.trim() && !hasAttachments)) return;

      const sender = await User.findById(client.userId).select('displayName avatarUrl');
      if (!sender) return;

      // Auto-subscribe participants if not yet subscribed (new conversations)
      if (!conversationSubscribers.has(conversationId)) {
        const conv = await Conversation.findById(conversationId).select('participants');
        if (conv) {
          conversationSubscribers.set(conversationId, new Set());
          for (const p of conv.participants) {
            const pid = p.toString();
            conversationSubscribers.get(conversationId)!.add(pid);
            // Also add to client's conversationIds
            const userClients = clients.get(pid);
            if (userClients) {
              for (const c of userClients) {
                c.conversationIds.add(conversationId);
              }
            }
          }
        }
      }

      let messageData: Record<string, unknown>;

      if (isEncrypted) {
        // E2EE message — store plaintext alongside envelope for multi-device access
        const plaintext = data.text?.trim() || null;
        const message = await Message.create({
          conversationId: new mongoose.Types.ObjectId(conversationId),
          senderId: new mongoose.Types.ObjectId(client.userId),
          type,
          text: plaintext,
          encryptedPayload: Buffer.from(data.envelope, 'utf8'),
          deliveredVia: 'ws',
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: { text: plaintext?.slice(0, 100) || 'Сообщение', senderName: sender.displayName, timestamp: message.createdAt },
          updatedAt: new Date(),
        });

        messageData = {
          id: message._id.toString(),
          conversationId,
          sender: { id: client.userId, displayName: sender.displayName, avatarUrl: sender.avatarUrl },
          type: message.type,
          text: plaintext,
          encrypted: true,
          envelope: data.envelope,
          status: 'sent',
          createdAt: message.createdAt.toISOString(),
        };
      } else {
        // Plaintext message (backward compatibility)
        const message = await Message.create({
          conversationId: new mongoose.Types.ObjectId(conversationId),
          senderId: new mongoose.Types.ObjectId(client.userId),
          type: hasAttachments ? (attachments[0].mimeType?.startsWith('image/') ? 'image' : 'file') : type,
          text: text?.trim() || null,
          attachments: hasAttachments ? attachments : [],
          replyToId: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
          forwardedFrom: forwardedFrom || null,
          deliveredVia: 'ws',
        });

        const lastText = message.text?.slice(0, 100) || (hasAttachments ? '📎 Файл' : '');
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: {
            text: lastText,
            senderName: sender.displayName,
            timestamp: message.createdAt,
          },
          updatedAt: new Date(),
        });

        messageData = {
          id: message._id.toString(),
          conversationId,
          sender: {
            id: client.userId,
            displayName: sender.displayName,
          },
          type: message.type,
          text: message.text,
          attachments: message.attachments || [],
          replyToId: message.replyToId?.toString() || null,
          forwardedFrom: message.forwardedFrom || null,
          status: 'sent',
          createdAt: message.createdAt.toISOString(),
        };
      }

      // Send back to sender (confirmation)
      client.ws.send(JSON.stringify({ event: 'message:sent', data: messageData }));

      // Broadcast to other participants (also send conversation data for new chats)
      const conv = await Conversation.findById(conversationId)
        .populate('participants', 'displayName avatarUrl')
        .lean();
      if (conv) {
        const lastMessageText = (messageData.text as string) || (isEncrypted ? 'Сообщение' : '');
        const convData = {
          id: conv._id.toString(),
          type: conv.type,
          participants: (conv.participants as any[]).map((p: any) => ({
            id: p._id.toString(),
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
          })),
          groupMeta: conv.groupMeta || null,
          lastMessage: { text: lastMessageText, senderId: client.userId, createdAt: messageData.createdAt },
          unreadCount: 1,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Send conversation:new event to other participants so chat appears in their sidebar
        for (const p of conv.participants as any[]) {
          const pid = p._id.toString();
          if (pid !== client.userId) {
            sendToUser(pid, 'conversation:new', convData);
          }
        }
      }

      broadcastToConversation(conversationId, 'message:new', messageData, client.userId);
      break;
    }

    case 'message:delivered': {
      const { messageId } = data;
      await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
      // Notify sender about delivery
      const msg = await Message.findById(messageId);
      if (msg) {
        sendToUser(msg.senderId.toString(), 'message:status', {
          messageId,
          status: 'delivered',
        });
      }
      break;
    }

    case 'message:read': {
      const { messageId } = data;
      await Message.findByIdAndUpdate(messageId, { status: 'read' });
      const msg = await Message.findById(messageId);
      if (msg) {
        sendToUser(msg.senderId.toString(), 'message:status', {
          messageId,
          status: 'read',
        });
      }
      break;
    }

    case 'typing:start':
    case 'typing:stop': {
      const { conversationId } = data;
      broadcastToConversation(conversationId, event, {
        userId: client.userId,
        conversationId,
      }, client.userId);
      break;
    }

    case 'presence:ping': {
      client.ws.send(JSON.stringify({ event: 'presence:pong', data: {} }));
      await User.findByIdAndUpdate(client.userId, { lastSeen: new Date() });
      break;
    }
  }
}

function broadcastOnlineStatus(userId: string, online: boolean) {
  // Broadcast to all connected clients
  const event = online ? 'user:online' : 'user:offline';
  for (const [, userClients] of clients) {
    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ event, data: { userId } }));
      }
    }
  }
}
