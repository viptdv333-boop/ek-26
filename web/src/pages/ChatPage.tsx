import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatRoom } from '../components/ChatRoom';
import { useChatStore } from '../stores/chatStore';
import { conversationsApi } from '../services/api/endpoints';
import { wsTransport } from '../services/transport/WebSocketTransport';
import { keyManager } from '../services/crypto';
import { requestNotificationPermission, onForegroundMessage } from '../services/firebase';
import { CallOverlay } from '../components/CallOverlay';
import { InstallPrompt } from '../components/InstallPrompt';
import { callManager } from '../services/webrtc/CallManager';
import { MayakThemeContext, useMayakTheme, useMayakThemeProvider } from '../hooks/useMayakTheme';
import { BottomNav, type MayakScreen } from '../components/mayak/BottomNav';
import { RadialHub } from '../components/mayak/RadialHub';
import { CallsScreen } from '../components/mayak/CallsScreen';
import { ContactsScreen } from '../components/mayak/ContactsScreen';
import { AIChatScreen } from '../components/mayak/AIChatScreen';
import { SettingsScreen } from '../components/mayak/SettingsScreen';

function MayakScreenPanel({ screen, onOpenChat, onOpenAIChat }: {
  screen: MayakScreen;
  onOpenChat: (id: string) => void;
  onOpenAIChat: () => void;
}) {
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      {screen === 'hub' && <RadialHub onOpenChat={onOpenChat} />}
      {screen === 'calls' && <CallsScreen onOpenChat={onOpenChat} />}
      {screen === 'contacts' && <ContactsScreen onOpenChat={onOpenChat} />}
      {screen === 'ai' && <AIChatScreen onOpenAIChat={onOpenAIChat} />}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  );
}

function ChatPageInner() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const setConversations = useChatStore((s) => s.setConversations);
  const conversations = useChatStore((s) => s.conversations);
  const prevActiveRef = useRef<string | null>(null);

  const [screen, setScreen] = useState<MayakScreen>('hub');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock viewport for chat layout
  useEffect(() => {
    document.documentElement.classList.add('app-fixed-viewport');
    return () => { document.documentElement.classList.remove('app-fixed-viewport'); };
  }, []);

  useEffect(() => {
    conversationsApi.list().then((res) => {
      const list = Array.isArray(res) ? res : res.conversations ?? [];
      setConversations(list);
    }).catch(() => {});

    wsTransport.connect();

    const registerKeys = (attempt = 1) => {
      keyManager.ensureKeysRegistered().catch((err: unknown) => {
        console.warn(`E2EE key registration attempt ${attempt} failed:`, err);
        if (attempt < 3) {
          setTimeout(() => registerKeys(attempt + 1), 2000 * attempt);
        }
      });
    };
    registerKeys();

    requestNotificationPermission().catch(() => {});

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

    const handleSWMessage = (event: MessageEvent) => {
      const { type } = event.data || {};
      if (type === 'call:accept') {
        callManager.acceptCall();
      } else if (type === 'call:decline') {
        callManager.declineCall();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        conversationsApi.list().then((res) => {
          const list = Array.isArray(res) ? res : res.conversations ?? [];
          setConversations(list);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      wsTransport.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [setConversations]);

  // Handle Android back button via History API
  useEffect(() => {
    if (activeConversationId && !prevActiveRef.current) {
      window.history.pushState({ chat: activeConversationId }, '');
    }
    prevActiveRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const handlePopState = () => {
      if (useChatStore.getState().activeConversationId) {
        setActiveConversation(null);
        window.dispatchEvent(new Event('sidebar-shown'));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveConversation]);

  const handleOpenChat = useCallback((conversationId: string) => {
    setActiveConversation(conversationId);
  }, [setActiveConversation]);

  const handleOpenAIChat = useCallback(() => {
    const aiConv = conversations.find((c) => c.type === 'ai');
    if (aiConv) {
      setActiveConversation(aiConv.id);
    }
  }, [conversations, setActiveConversation]);

  // Mobile: full-screen Mayak screens, chat replaces everything
  if (isMobile) {
    return (
      <div className="mayak-app" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeConversationId ? (
          <ChatRoom conversationId={activeConversationId} />
        ) : (
          <>
            <MayakScreenPanel screen={screen} onOpenChat={handleOpenChat} onOpenAIChat={handleOpenAIChat} />
            <BottomNav active={screen} onNav={setScreen} />
          </>
        )}
        <CallOverlay />
        <InstallPrompt />
      </div>
    );
  }

  // Desktop: Mayak panel (left, 380px) + ChatRoom (right)
  return (
    <div className="mayak-app" style={{ height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      {/* Left panel — Mayak screens + bottom nav */}
      <div style={{ width: '45%', maxWidth: 560, minWidth: 420, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)' }}>
        <MayakScreenPanel screen={screen} onOpenChat={handleOpenChat} onOpenAIChat={handleOpenAIChat} />
        <BottomNav active={screen} onNav={setScreen} large />
      </div>
      {/* Right panel — ChatRoom or empty */}
      <div style={{ flex: 1, display: 'flex' }}>
        {activeConversationId ? (
          <ChatRoom conversationId={activeConversationId} />
        ) : (
          <DesktopEmpty />
        )}
      </div>
      <CallOverlay />
      <InstallPrompt />
    </div>
  );
}

function DesktopEmpty() {
  const { th } = useMayakTheme();
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: th.bg, gap: 12,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: `linear-gradient(135deg,${th.primary},#818CF8)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 30px ${th.glow}`,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" stroke="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: th.text }}>Выберите чат</div>
      <div style={{ fontSize: 14, color: th.sec }}>или начните новый разговор</div>
    </div>
  );
}

export function ChatPage() {
  const themeCtx = useMayakThemeProvider();

  return (
    <MayakThemeContext.Provider value={themeCtx}>
      <ChatPageInner />
    </MayakThemeContext.Provider>
  );
}
