import { useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatRoom } from '../components/ChatRoom';
import { EmptyState } from '../components/EmptyState';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { conversationsApi } from '../services/api/endpoints';
import { wsTransport } from '../services/transport/WebSocketTransport';
import { keyManager } from '../services/crypto';

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

    // Initialize E2EE keys (retry on failure)
    const registerKeys = (attempt = 1) => {
      keyManager.ensureKeysRegistered().catch((err: unknown) => {
        console.warn(`E2EE key registration attempt ${attempt} failed:`, err);
        if (attempt < 3) {
          setTimeout(() => registerKeys(attempt + 1), 2000 * attempt);
        }
      });
    };
    registerKeys();

    return () => wsTransport.disconnect();
  }, [setConversations]);

  return (
    <div className="h-screen flex bg-dark-900">
      {/* Mobile: show sidebar OR chat, not both */}
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-auto`}>
        <Sidebar />
      </div>
      <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1`}>
        {activeConversationId ? <ChatRoom conversationId={activeConversationId} /> : <EmptyState />}
      </div>
    </div>
  );
}
