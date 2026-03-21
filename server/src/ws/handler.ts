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

    // Send confirmation
    socket.send(JSON.stringify({ event: 'connected', data: { userId } }));

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
      const { conversationId, text, type = 'text', replyToId } = data;
      if (!conversationId || !text?.trim()) return;

      const sender = await User.findById(client.userId).select('displayName');
      if (!sender) return;

      const message = await Message.create({
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: new mongoose.Types.ObjectId(client.userId),
        type,
        text: text.trim(),
        replyToId: replyToId ? new mongoose.Types.ObjectId(replyToId) : null,
        deliveredVia: 'ws',
      });

      // Update conversation last message
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          text: text.trim().slice(0, 100),
          senderName: sender.displayName,
          timestamp: message.createdAt,
        },
        updatedAt: new Date(),
      });

      const messageData = {
        id: message._id.toString(),
        conversationId,
        sender: {
          id: client.userId,
          displayName: sender.displayName,
        },
        type: message.type,
        text: message.text,
        replyToId: message.replyToId?.toString() || null,
        status: 'sent',
        createdAt: message.createdAt.toISOString(),
      };

      // Send back to sender (confirmation)
      client.ws.send(JSON.stringify({ event: 'message:sent', data: messageData }));

      // Broadcast to other participants
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
