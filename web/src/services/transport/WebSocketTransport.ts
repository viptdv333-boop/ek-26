import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

type EventHandler = (data: any) => void;

class WebSocketTransport {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private handlers = new Map<string, Set<EventHandler>>();
  private _connected = false;

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

  private handleBuiltinEvent(event: string, data: any) {
    const store = useChatStore.getState();
    switch (event) {
      case 'message:new': {
        // From other users — data has sender object
        const msg = {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.sender?.id || data.senderId,
          senderName: data.sender?.displayName,
          type: data.type,
          text: data.text,
          status: data.status || 'sent',
          createdAt: data.createdAt,
        };
        store.addMessage(data.conversationId, msg);
        store.updateLastMessage(data.conversationId, {
          text: data.text || '',
          senderId: msg.senderId,
          createdAt: data.createdAt,
        });
        // Sort conversations by last activity
        store.sortConversations();
        break;
      }

      case 'message:sent': {
        // Echo of our own sent message
        const msg = {
          id: data.id,
          conversationId: data.conversationId,
          senderId: data.sender?.id || data.senderId,
          senderName: data.sender?.displayName,
          type: data.type,
          text: data.text,
          status: 'sent',
          createdAt: data.createdAt,
        };
        store.addMessage(data.conversationId, msg);
        store.updateLastMessage(data.conversationId, {
          text: data.text || '',
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
        // New conversation created by another user — add to sidebar
        store.addConversation(data);
        store.sortConversations();
        break;
      }

      case 'online:list':
        if (Array.isArray(data.userIds)) {
          data.userIds.forEach((id: string) => store.setUserOnline(id, true));
        }
        break;
    }
  }
}

export const wsTransport = new WebSocketTransport();
