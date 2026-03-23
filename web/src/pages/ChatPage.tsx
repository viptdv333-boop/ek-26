import { useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatRoom } from '../components/ChatRoom';
import { EmptyState } from '../components/EmptyState';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { conversationsApi } from '../services/api/endpoints';
import { wsTransport } from '../services/transport/WebSocketTransport';
import { keyManager } from '../services/crypto';
import { requestNotificationPermission, onForegroundMessage } from '../services/firebase';

export function ChatPage() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const setConversations = useChatStore((s) => s.setConversations);
  const prevActiveRef = useRef<string | null>(null);

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

    // Request push notification permission
    requestNotificationPermission().catch(() => {});

    // Handle foreground push messages — show notification if chat not active
    onForegroundMessage((payload: any) => {
      const activeConvId = useChatStore.getState().activeConversationId;
      const convId = payload.data?.conversationId;
      if (convId && convId !== activeConvId && Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'FOMO Chat', {
          body: payload.notification?.body || 'Новое сообщение',
          icon: '/icon-192.png',
          tag: convId,
        });
      }
    });

    return () => wsTransport.disconnect();
  }, [setConversations]);

  // Handle Android back button via History API
  useEffect(() => {
    // When opening a chat, push a history entry
    if (activeConversationId && !prevActiveRef.current) {
      window.history.pushState({ chat: activeConversationId }, '');
    }
    prevActiveRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const handlePopState = () => {
      // Android back button triggers popstate — go back to chat list
      if (useChatStore.getState().activeConversationId) {
        setActiveConversation(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveConversation]);

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
