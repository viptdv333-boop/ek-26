import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useTransportStore } from '../../stores/transportStore';

const WS_URL = __DEV__ ? 'ws://10.0.2.2:3000/ws' : 'wss://api.ek26.app/ws';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function connectWebSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token || ws?.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(`${WS_URL}?token=${token}`);

  ws.onopen = () => {
    console.log('[WS] Connected');
    useTransportStore.getState().setWsConnected(true);
    reconnectDelay = 1000;
  };

  ws.onmessage = (event) => {
    try {
      const { event: eventName, data } = JSON.parse(event.data);
      handleWsEvent(eventName, data);
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  };

  ws.onclose = (event) => {
    console.log('[WS] Disconnected:', event.code, event.reason);
    useTransportStore.getState().setWsConnected(false);
    ws = null;

    // Don't reconnect if logged out
    if (!useAuthStore.getState().isAuthenticated) return;

    // Exponential backoff reconnect
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      connectWebSocket();
    }, reconnectDelay);
  };

  ws.onerror = (error) => {
    console.error('[WS] Error:', error);
  };
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close(1000, 'User disconnected');
    ws = null;
  }
  useTransportStore.getState().setWsConnected(false);
}

export function sendWsEvent(event: string, data: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
    return true;
  }
  return false;
}

export function sendMessage(conversationId: string, text: string, replyToId?: string) {
  return sendWsEvent('message:send', { conversationId, text, replyToId });
}

export function sendTyping(conversationId: string, isTyping: boolean) {
  return sendWsEvent(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
}

export function markDelivered(messageId: string) {
  return sendWsEvent('message:delivered', { messageId });
}

export function markRead(messageId: string) {
  return sendWsEvent('message:read', { messageId });
}

function handleWsEvent(event: string, data: any) {
  const chatStore = useChatStore.getState();
  const transportStore = useTransportStore.getState();
  const currentUserId = useAuthStore.getState().user?.id;

  switch (event) {
    case 'connected':
      console.log('[WS] Authenticated as:', data.userId);
      break;

    case 'message:new': {
      chatStore.addMessage(data.conversationId, data);
      chatStore.updateLastMessage(data.conversationId, {
        text: data.text || '',
        senderName: data.sender.displayName,
        timestamp: data.createdAt,
      });

      // Auto-mark delivered
      markDelivered(data.id);

      // Auto-mark read if viewing this conversation
      if (chatStore.activeConversationId === data.conversationId) {
        markRead(data.id);
      } else {
        chatStore.incrementUnread(data.conversationId);
      }
      break;
    }

    case 'message:sent':
      // Confirmation of our own message
      chatStore.addMessage(data.conversationId, data);
      chatStore.updateLastMessage(data.conversationId, {
        text: data.text || '',
        senderName: data.sender.displayName,
        timestamp: data.createdAt,
      });
      break;

    case 'message:status':
      // Update message status in store (could add this to chatStore if needed)
      break;

    case 'typing:start':
      if (data.userId !== currentUserId) {
        chatStore.setTyping(data.conversationId, data.userId, true);
        // Auto-clear after 5 seconds
        setTimeout(() => {
          chatStore.setTyping(data.conversationId, data.userId, false);
        }, 5000);
      }
      break;

    case 'typing:stop':
      if (data.userId !== currentUserId) {
        chatStore.setTyping(data.conversationId, data.userId, false);
      }
      break;

    case 'user:online':
      transportStore.addOnlineUser(data.userId);
      break;

    case 'user:offline':
      transportStore.removeOnlineUser(data.userId);
      break;

    case 'presence:pong':
      // Heartbeat acknowledged
      break;
  }
}
