import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { sessionManager, messageCache, keyManager } from '../crypto';

type EventHandler = (data: any) => void;

class WebSocketTransport {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
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
    };

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
        if (encrypted && data.envelope) {
          try {
            text = await sessionManager.decryptMessage(data.sender?.id || data.senderId, data.envelope);
            await messageCache.put(data.id, text);
          } catch (err) {
            console.error('Decrypt error (message:new):', err);
            text = '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435';
          }
        }
        const msg = {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.sender?.id || data.senderId,
          senderName: data.sender?.displayName,
          type: data.type,
          text,
          encrypted,
          status: data.status || 'sent',
          createdAt: data.createdAt,
        };
        store.addMessage(data.conversationId, msg);
        store.updateLastMessage(data.conversationId, {
          text: encrypted ? (text || '\u0417\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435') : (text || ''),
          senderId: msg.senderId,
          createdAt: data.createdAt,
        });
        // Increment unread if this conversation is not active
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
          // Try pending plaintext first, then cache
          const pending = this.consumePendingText(data.conversationId);
          if (pending) {
            text = pending;
            await messageCache.put(data.id, text);
          } else {
            const cached = await messageCache.get(data.id);
            text = cached || '\u0417\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435';
          }
        }
        const msg = {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.sender?.id || data.senderId,
          senderName: data.sender?.displayName,
          type: data.type,
          text,
          encrypted,
          status: 'sent',
          createdAt: data.createdAt,
        };
        store.addMessage(data.conversationId, msg);
        store.updateLastMessage(data.conversationId, {
          text: encrypted ? (text || '\u0417\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435') : (text || ''),
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

      case 'keys:low':
        keyManager.replenishIfNeeded().catch(console.error);
        break;
    }
  }
}

export const wsTransport = new WebSocketTransport();
