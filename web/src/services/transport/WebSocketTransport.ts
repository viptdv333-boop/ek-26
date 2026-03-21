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
      case 'message:new':
        store.addMessage(data.conversationId, data);
        store.updateLastMessage(data.conversationId, {
          text: data.text || '',
          senderId: data.senderId,
          createdAt: data.createdAt,
        });
        break;
      case 'typing:start':
        store.setTyping(data.conversationId, [
          ...(store.typingUsers[data.conversationId] || []).filter((id) => id !== data.userId),
          data.userId,
        ]);
        break;
      case 'typing:stop':
        store.setTyping(
          data.conversationId,
          (store.typingUsers[data.conversationId] || []).filter((id) => id !== data.userId)
        );
        break;
    }
  }
}

export const wsTransport = new WebSocketTransport();
