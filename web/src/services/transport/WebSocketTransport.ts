import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { sessionManager, messageCache, keyManager, senderKeyManager, groupSessionManager } from '../crypto';
import { callManager } from '../webrtc/CallManager';

type EventHandler = (data: any) => void;

class WebSocketTransport {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private _visibilityHandler: (() => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private _connected = false;
  private _pendingTexts = new Map<string, string>();

  setPendingText(convId: string, text: string) {
    this._pendingTexts.set(convId, text);
  }

  private consumePendingText(convId: string): string | undefined {
    const t = this._pendingTexts.get(convId);
    this._pendingTexts.delete(convId);
    return t;
  }

  get connected() {
    return this._connected;
  }

  connect() {
    const token = useAuthStore.getState().token;
    if (!token || this.ws) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.ws = new WebSocket(`${protocol}//${host}/ws?token=${token}`);

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectDelay = 1000;
      this.emit('connection', { status: 'connected' });

      // Start heartbeat to keep connection alive on mobile
      this.startHeartbeat();
    };

    // Reconnect when app returns to foreground (mobile)
    if (!this._visibilityHandler) {
      this._visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.ws = null;
            this._connected = false;
            this.connect();
          }
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);

      // Also reconnect on network restore
      window.addEventListener('online', () => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.ws = null;
          this._connected = false;
          this.connect();
        }
      });
    }

    this.ws.onmessage = (event) => {
      try {
        const { event: evtName, data } = JSON.parse(event.data);
        this.emit(evtName, data);
        this.handleBuiltinEvent(evtName, data);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.ws = null;
      this.emit('connection', { status: 'disconnected' });
      // Auto-end call on WS disconnect
      try {
        const { callManager } = require('../webrtc/CallManager');
        const { useCallStore } = require('../../stores/callStore');
        if (useCallStore.getState().activeCall) {
          callManager.handleCallEnded();
        }
      } catch {}
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }

  send(event: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
      if (event.startsWith('call:')) console.log(`[WS] Sent: ${event}`);
    } else {
      console.error(`[WS] Cannot send ${event} — socket not open (state=${this.ws?.readyState})`);
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'ping' }));
      }
    }, 25000); // Every 25s to prevent mobile timeout
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private async handleBuiltinEvent(event: string, data: any) {
    const store = useChatStore.getState();
    const currentUserId = useAuthStore.getState().user?.id;

    switch (event) {
      case 'message:new': {
        // From other users — data has sender object
        let text = data.text;
        const encrypted = !!data.encrypted;
        const groupEncrypted = !!data.groupEncrypted;
        // If server provides text, use it; only decrypt if text is missing (old flow)
        if (!text && encrypted && data.envelope) {
          try {
            text = await sessionManager.decryptMessage(data.sender?.id || data.senderId, data.envelope);
            await messageCache.put(data.id, text);
          } catch (err) {
            console.error('Decrypt error (message:new):', err);
            text = 'Сообщение';
          }
        } else if (!text && groupEncrypted && data.envelope) {
          try {
            const senderId = data.sender?.id || data.senderId;
            text = await groupSessionManager.decryptGroupMessage(data.conversationId, senderId, data.envelope);
            await messageCache.put(data.id, text);
          } catch (err) {
            console.error('Group decrypt error (message:new):', err);
            text = '🔒 Зашифровано';
          }
        }
        const hasAttachments = Array.isArray(data.attachments) && data.attachments.length > 0;
        const msg = {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.sender?.id || data.senderId,
          senderName: data.sender?.displayName,
          senderAvatarUrl: data.sender?.avatarUrl || null,
          type: data.type,
          text,
          attachments: data.attachments || [],
          replyToId: data.replyToId || null,
          replyTo: data.replyTo || null,
          forwardedFrom: data.forwardedFrom || null,
          encrypted,
          status: data.status || 'sent',
          createdAt: data.createdAt,
          callData: data.callData || null,
        };
        store.addMessage(data.conversationId, msg);
        const lastText = data.type === 'call'
          ? (data.callData?.callType === 'video' ? '📹 Видеозвонок' : '📞 Звонок')
          : encrypted ? (text || 'Зашифрованное сообщение') : (hasAttachments ? (text || '📎 Файл') : (text || ''));
        store.updateLastMessage(data.conversationId, {
          text: lastText,
          senderId: msg.senderId,
          createdAt: data.createdAt,
        });
        if (store.activeConversationId !== data.conversationId) {
          store.incrementUnread(data.conversationId);
        }
        store.sortConversations();
        break;
      }

      case 'message:sent': {
        // Echo of our own sent message
        let text = data.text;
        const encrypted = !!data.encrypted;
        if (encrypted) {
          const pending = this.consumePendingText(data.conversationId);
          if (pending) {
            text = pending;
            await messageCache.put(data.id, text);
          } else {
            const cached = await messageCache.get(data.id);
            text = cached || 'Зашифрованное сообщение';
          }
        }
        const hasAttachments2 = Array.isArray(data.attachments) && data.attachments.length > 0;
        const msg = {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.sender?.id || data.senderId,
          senderName: data.sender?.displayName,
          senderAvatarUrl: data.sender?.avatarUrl || null,
          type: data.type,
          text,
          attachments: data.attachments || [],
          replyToId: data.replyToId || null,
          replyTo: data.replyTo || null,
          forwardedFrom: data.forwardedFrom || null,
          encrypted,
          status: 'sent',
          createdAt: data.createdAt,
        };
        store.addMessage(data.conversationId, msg);
        const lastText2 = encrypted ? (text || 'Зашифрованное сообщение') : (hasAttachments2 ? (text || '📎 Файл') : (text || ''));
        store.updateLastMessage(data.conversationId, {
          text: lastText2,
          senderId: msg.senderId,
          createdAt: data.createdAt,
        });
        store.sortConversations();
        break;
      }

      case 'message:status': {
        store.updateMessageStatus(data.messageId, data.status);
        break;
      }

      case 'message:edited': {
        store.editMessage(data.messageId, data.text, data.editedAt);
        break;
      }

      case 'message:deleted': {
        store.deleteMessage(data.messageId);
        break;
      }

      case 'message:pinned': {
        store.addPinnedMessage(data.conversationId, {
          id: data.messageId,
          text: data.text,
          senderName: data.senderName,
        });
        break;
      }

      case 'message:unpinned': {
        store.removePinnedMessage(data.conversationId, data.messageId);
        break;
      }

      case 'typing':
        // AI typing: server sends { conversationId, userIds: ['ai-bot'] } or { conversationId, userIds: [] }
        if (Array.isArray(data.userIds)) {
          store.setTyping(data.conversationId, data.userIds);
        }
        break;

      case 'typing:start':
        store.setTyping(data.conversationId, [
          ...(store.typingUsers[data.conversationId] || []).filter((id: string) => id !== data.userId),
          data.userId,
        ]);
        // Auto-clear typing after 3s
        setTimeout(() => {
          const s = useChatStore.getState();
          s.setTyping(
            data.conversationId,
            (s.typingUsers[data.conversationId] || []).filter((id: string) => id !== data.userId)
          );
        }, 3000);
        break;

      case 'typing:stop':
        store.setTyping(
          data.conversationId,
          (store.typingUsers[data.conversationId] || []).filter((id: string) => id !== data.userId)
        );
        break;

      case 'user:online':
        store.setUserOnline(data.userId, true);
        break;

      case 'user:offline':
        store.setUserOnline(data.userId, false);
        break;

      case 'conversation:new': {
        store.addConversation(data);
        store.sortConversations();
        break;
      }

      case 'online:list':
        if (Array.isArray(data.userIds)) {
          data.userIds.forEach((id: string) => store.setUserOnline(id, true));
        }
        break;

      case 'call:incoming':
        callManager.handleIncomingCall(data);
        break;

      case 'call:answer':
        callManager.handleAnswer(data);
        break;

      case 'call:ice':
        callManager.handleIceCandidate(data);
        break;

      case 'call:end':
        callManager.handleCallEnded();
        break;

      case 'call:decline':
        callManager.handleCallDeclined();
        break;

      case 'call:busy':
        callManager.handleCallBusy();
        break;

      case 'reaction:updated':
        store.updateReactions(data.messageId, data.reactions);
        break;

      // Game events — relay to window for iframe games
      case 'game:move':
      case 'game:state':
      case 'game:end':
        window.dispatchEvent(new CustomEvent('game-event', { detail: { event, data } }));
        break;

      case 'keys:low':
        keyManager.replenishIfNeeded().catch(console.error);
        break;

      case 'group:senderkey':
        // New sender key bundle arrived for a group — fetch and decrypt
        if (data?.conversationId && data?.fromUserId) {
          senderKeyManager.handleSenderKeyNotification(data.conversationId, data.fromUserId).catch(console.error);
        }
        break;
    }
  }
}

export const wsTransport = new WebSocketTransport();
