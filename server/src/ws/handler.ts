import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { jwtVerify } from 'jose';
import { config } from '../config';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { sendPushNotification } from '../services/push';

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
// Map: callId -> call metadata (for call reports + pending call delivery)
const activeCalls = new Map<string, {
  callerId: string;
  targetUserId: string;
  callType: 'audio' | 'video';
  startedAt: number; // timestamp when offer sent
  answeredAt: number | null; // timestamp when answered
  offer: any; // SDP offer for re-delivery on reconnect
  callerName: string;
  callerAvatar: string | null;
}>();

async function saveCallReport(
  callId: string,
  status: 'missed' | 'declined' | 'completed' | 'no-answer',
) {
  const call = activeCalls.get(callId);
  if (!call) return;
  activeCalls.delete(callId);

  const duration = (call.answeredAt && status === 'completed')
    ? Math.round((Date.now() - call.answeredAt) / 1000)
    : null;

  // Find conversation between caller and target
  const conv = await Conversation.findOne({
    participants: { $all: [call.callerId, call.targetUserId] },
    isGroup: { $ne: true },
  });
  if (!conv) return;

  const msg = await Message.create({
    conversationId: conv._id,
    senderId: call.callerId,
    type: 'call',
    callData: {
      callType: call.callType,
      status,
      duration,
      callerId: call.callerId,
    },
  });

  // Broadcast call report message to both users
  const populated = {
    _id: msg._id,
    conversationId: conv._id.toString(),
    senderId: call.callerId,
    type: 'call',
    callData: msg.callData,
    createdAt: msg.createdAt,
  };

  sendToUser(call.callerId, 'message:new', populated);
  sendToUser(call.targetUserId, 'message:new', populated);

  // Update conversation lastMessage
  await Conversation.findByIdAndUpdate(conv._id, {
    lastMessage: msg._id,
    lastMessageAt: msg.createdAt,
  });
}

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

    // Re-deliver pending call if user reconnects while being called
    for (const [callId, call] of activeCalls) {
      if (call.targetUserId === userId && !call.answeredAt) {
        const elapsed = Date.now() - call.startedAt;
        if (elapsed < 30000) { // Only if call is still ringing (< 30s)
          console.log(`[Call] Re-delivering pending call ${callId} to reconnected user ${userId}`);
          socket.send(JSON.stringify({
            event: 'call:incoming',
            data: {
              callId,
              callerId: call.callerId,
              callerName: call.callerName,
              callerAvatar: call.callerAvatar,
              type: call.callType,
              offer: call.offer,
            },
          }));
        }
      }
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
  if (event.startsWith('call:')) {
    console.log(`[WS] Event: ${event} from user ${client.userId}`);
  }
  switch (event) {
    case 'message:send': {
      const { conversationId, text, type = 'text', replyToId, attachments, forwardedFrom } = data;

      const isEncrypted = !!(data.encrypted && data.envelope);

      // For plaintext messages, text or attachments required; for encrypted, envelope required
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if (!conversationId || (!isEncrypted && !text?.trim() && !hasAttachments)) return;

      const sender = await User.findById(client.userId).select('displayName avatarUrl');
      if (!sender) return;

      // Load conversation for participants (needed for push + auto-subscribe)
      const conv = await Conversation.findById(conversationId).select('participants type');

      // Auto-subscribe participants if not yet subscribed (new conversations)
      if (conv && !conversationSubscribers.has(conversationId)) {
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
      const convFull = await Conversation.findById(conversationId)
        .populate('participants', 'displayName avatarUrl')
        .lean();
      if (convFull) {
        const lastMessageText = (messageData.text as string) || (isEncrypted ? 'Сообщение' : '');
        const convData = {
          id: convFull._id.toString(),
          type: convFull.type,
          participants: (convFull.participants as any[]).map((p: any) => ({
            id: p._id.toString(),
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
          })),
          groupMeta: convFull.groupMeta || null,
          lastMessage: { text: lastMessageText, senderId: client.userId, createdAt: messageData.createdAt },
          unreadCount: 1,
          createdAt: convFull.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Send conversation:new event to other participants so chat appears in their sidebar
        for (const p of convFull.participants as any[]) {
          const pid = p._id.toString();
          if (pid !== client.userId) {
            sendToUser(pid, 'conversation:new', convData);
          }
        }
      }

      // ── AI Bot response ──────────────────────────────────────────
      if (conv && (conv as any).type === 'ai') {
        try {
          const { getAiSettings } = await import('../models/Settings.js');
          const { getAiResponse, checkRateLimit } = await import('../services/ai.js');
          const aiSettings = await getAiSettings();

          if (aiSettings.provider !== 'disabled') {
            if (!checkRateLimit(client.userId, aiSettings.dailyLimitPerUser)) {
              // Over limit — send system message
              const limitMsg = await Message.create({
                conversationId: new mongoose.Types.ObjectId(conversationId),
                senderId: new mongoose.Types.ObjectId(conversationId), // bot "sends" from conv ID as placeholder
                text: `⚠️ Дневной лимит AI-запросов (${aiSettings.dailyLimitPerUser}) исчерпан. Попробуйте завтра.`,
                type: 'system',
                status: 'sent',
              });
              sendToUser(client.userId, 'message:new', {
                id: limitMsg._id.toString(),
                conversationId,
                senderId: 'ai-bot',
                senderName: 'FOMO AI',
                text: limitMsg.text,
                type: 'system',
                status: 'sent',
                createdAt: limitMsg.createdAt.toISOString(),
              });
            } else {
              // Send typing indicator
              sendToUser(client.userId, 'typing', { conversationId, userIds: ['ai-bot'] });

              // Get conversation history (last 10 messages)
              const historyMsgs = await Message.find({ conversationId: new mongoose.Types.ObjectId(conversationId) })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
              const history = historyMsgs.reverse().slice(0, -1).map((m: any) => ({
                role: m.senderId?.toString() === client.userId ? 'user' as const : 'model' as const,
                text: m.text || '',
              }));

              const aiText = await getAiResponse(history, data.text || '');

              // Save AI response
              const aiMsg = await Message.create({
                conversationId: new mongoose.Types.ObjectId(conversationId),
                senderId: new mongoose.Types.ObjectId(conversationId), // placeholder
                text: aiText,
                type: 'text',
                status: 'sent',
              });

              // Clear typing
              sendToUser(client.userId, 'typing', { conversationId, userIds: [] });

              // Send AI message to user
              sendToUser(client.userId, 'message:new', {
                id: aiMsg._id.toString(),
                conversationId,
                senderId: 'ai-bot',
                senderName: 'FOMO AI',
                text: aiText,
                type: 'text',
                status: 'sent',
                createdAt: aiMsg.createdAt.toISOString(),
              });

              // Update conversation lastMessage
              await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: { text: aiText, senderName: 'FOMO AI', timestamp: new Date() },
                updatedAt: new Date(),
              });
            }
          }
        } catch (err) {
          console.error('[AI] Error processing AI message:', err);
        }
      }

      broadcastToConversation(conversationId, 'message:new', messageData, client.userId);

      // Send push notifications to all other participants
      // Always send push — on Android PWA, background tabs throttle WebSocket
      for (const p of (conv?.participants || []) as any[]) {
        const pid = p._id ? p._id.toString() : p.toString();
        if (pid === client.userId) continue;
        sendPushNotification(pid, {
          title: sender.displayName || 'FOMO Chat',
          body: (messageData as any).text || 'Новое сообщение',
          data: { conversationId, messageId: (messageData as any).id },
        });
      }
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

    // ── Game events ──────────────────────────────────────────────
    case 'game:move': {
      const { targetUserId, gameData } = data;
      sendToUser(targetUserId, 'game:move', { userId: client.userId, gameData });
      break;
    }

    case 'game:state': {
      const { targetUserId, state } = data;
      sendToUser(targetUserId, 'game:state', { state });
      break;
    }

    case 'game:end': {
      const { targetUserId } = data;
      sendToUser(targetUserId, 'game:end', { userId: client.userId });
      break;
    }

    case 'call:offer': {
      const { targetUserId, callId, type, offer } = data;
      console.log(`[Call] Incoming call from ${client.userId} to ${targetUserId}, type=${type}`);
      const caller = await User.findById(client.userId).select('displayName avatarUrl').lean();
      const callerName = caller?.displayName || 'Пользователь';

      // Track call for reports + pending delivery on reconnect
      activeCalls.set(callId, {
        callerId: client.userId,
        targetUserId,
        callType: type,
        startedAt: Date.now(),
        answeredAt: null,
        offer,
        callerName,
        callerAvatar: caller?.avatarUrl || null,
      });

      sendToUser(targetUserId, 'call:incoming', {
        callId,
        callerId: client.userId,
        callerName,
        callerAvatar: caller?.avatarUrl || null,
        type,
        offer,
      });
      // Send push notification for incoming call (wakes up PWA in background)
      console.log(`[Call] Sending push to ${targetUserId}`);
      sendPushNotification(targetUserId, {
        title: callerName,
        body: type === 'video' ? 'Видеозвонок...' : 'Аудиозвонок...',
        data: { type: 'call', callId, callerId: client.userId },
      });
      break;
    }

    case 'call:answer': {
      const { callerId, callId, answer } = data;
      // Mark call as answered for duration tracking
      const activeCall = activeCalls.get(callId);
      if (activeCall) activeCall.answeredAt = Date.now();
      sendToUser(callerId, 'call:answer', { callId, answer });
      break;
    }

    case 'call:ice': {
      const { targetUserId, callId, candidate } = data;
      sendToUser(targetUserId, 'call:ice', { callId, candidate });
      break;
    }

    case 'call:end': {
      const { targetUserId, callId, reason } = data;
      sendToUser(targetUserId, 'call:end', { callId, reason: reason || 'ended' });
      // Save call report
      const endedCall = activeCalls.get(callId);
      if (endedCall) {
        const status = endedCall.answeredAt ? 'completed' : 'no-answer';
        saveCallReport(callId, status).catch(console.error);
      }
      break;
    }

    case 'call:decline': {
      const { callerId, callId } = data;
      sendToUser(callerId, 'call:decline', { callId });
      saveCallReport(callId, 'declined').catch(console.error);
      break;
    }

    case 'call:busy': {
      const { callerId, callId } = data;
      // Delay busy by 3s to allow answer from another device (race condition: push + WS)
      const busyCall = activeCalls.get(callId);
      if (busyCall?.answeredAt) {
        console.log('[Call] Ignoring busy — call already answered:', callId);
        break;
      }
      setTimeout(() => {
        const call = activeCalls.get(callId);
        if (call?.answeredAt) {
          console.log('[Call] Ignoring delayed busy — call was answered:', callId);
          return;
        }
        sendToUser(callerId, 'call:busy', { callId });
        saveCallReport(callId, 'missed').catch(console.error);
      }, 3000);
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
