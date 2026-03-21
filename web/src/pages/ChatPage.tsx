import { useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatRoom } from '../components/ChatRoom';
import { EmptyState } from '../components/EmptyState';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { conversationsApi } from '../services/api/endpoints';
import { wsTransport } from '../services/transport/WebSocketTransport';

export function ChatPage() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setConversations = useChatStore((s) => s.setConversations);

  useEffect(() => {
    // Load conversations
    conversationsApi.list().then((res) => {
      const list = Array.isArray(res) ? res : res.conversations ?? [];
      setConversations(list);
    }).catch(() => {});

    // Connect WebSocket
    wsTransport.connect();
    return () => wsTransport.disconnect();
  }, [setConversations]);

  return (
    <div className="h-screen flex bg-dark-900">
      <Sidebar />
      {activeConversationId ? <ChatRoom conversationId={activeConversationId} /> : <EmptyState />}
    </div>
  );
}
