import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatRoom } from '../components/ChatRoom';
import { EmptyState } from '../components/EmptyState';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { conversationsApi } from '../services/api/endpoints';
import { wsTransport } from '../services/transport/WebSocketTransport';
import { keyManager } from '../services/crypto';
import { requestNotificationPermission, onForegroundMessage } from '../services/firebase';
import { CallOverlay } from '../components/CallOverlay';
import { callManager } from '../services/webrtc/CallManager';

export function ChatPage() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const setConversations = useChatStore((s) => s.setConversations);
  const prevActiveRef = useRef<string | null>(null);

  // Wallpaper — applied to entire chat layout (sidebar + chat area)
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('ek26_wallpaper') || 'default');
  useEffect(() => {
    const handler = () => setWallpaper(localStorage.getItem('ek26_wallpaper') || 'default');
    window.addEventListener('wallpaper-changed', handler);
    window.addEventListener('storage', handler);
    return () => { window.removeEventListener('wallpaper-changed', handler); window.removeEventListener('storage', handler); };
  }, []);

  const getWallpaperStyle = (): React.CSSProperties => {
    const isLight = document.documentElement.classList.contains('light');
    const presets: Record<string, string> = {
      'midnight-aurora': 'radial-gradient(ellipse at 20% 80%, rgba(56,189,248,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%), linear-gradient(135deg, #0a0a1a 0%, #0f172a 40%, #1e1b4b 100%)',
      'obsidian-glow': 'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.14) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(251,146,60,0.08) 0%, transparent 50%), linear-gradient(180deg, #0f0f0f 0%, #1a0a0a 50%, #0f0f0f 100%)',
      'deep-ocean': 'radial-gradient(ellipse at 30% 70%, rgba(6,182,212,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(59,130,246,0.1) 0%, transparent 50%), linear-gradient(160deg, #0a0f1a 0%, #0c1929 40%, #0a1628 100%)',
      'arctic-frost': 'radial-gradient(ellipse at 30% 20%, rgba(147,197,253,0.35) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(196,181,253,0.25) 0%, transparent 50%), linear-gradient(150deg, #f0f4ff 0%, #f5f3ff 50%, #eff6ff 100%)',
      'rose-quartz': 'radial-gradient(ellipse at 25% 75%, rgba(251,207,232,0.4) 0%, transparent 50%), radial-gradient(ellipse at 75% 25%, rgba(254,205,211,0.3) 0%, transparent 50%), linear-gradient(135deg, #fff5f7 0%, #fef2f2 50%, #fff1f2 100%)',
      'golden-hour': 'radial-gradient(ellipse at 30% 60%, rgba(253,224,71,0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(251,146,60,0.15) 0%, transparent 50%), linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fff7ed 100%)',
    };
    if (wallpaper === 'default') {
      return {
        background: isLight
          ? 'radial-gradient(ellipse at 30% 20%, rgba(220,38,38,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(147,197,253,0.12) 0%, transparent 50%), linear-gradient(150deg, #fafafa 0%, #f5f5f0 50%, #faf5f5 100%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.1) 0%, transparent 45%), radial-gradient(ellipse at 80% 100%, rgba(220,38,38,0.06) 0%, transparent 45%), linear-gradient(180deg, #0f0f0f 0%, #141010 50%, #0f0f0f 100%)',
      };
    }
    if (presets[wallpaper]) return { background: presets[wallpaper] };
    if (wallpaper.startsWith('http') || wallpaper.startsWith('/')) {
      return { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return {};
  };

  // Lock viewport for chat layout
  useEffect(() => {
    document.documentElement.classList.add('app-fixed-viewport');
    return () => { document.documentElement.classList.remove('app-fixed-viewport'); };
  }, []);

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

    // Listen for SW messages (notification action buttons)
    const handleSWMessage = (event: MessageEvent) => {
      const { type } = event.data || {};
      if (type === 'call:accept') {
        callManager.acceptCall();
      } else if (type === 'call:decline') {
        callManager.declineCall();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Reload conversations when app returns to foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Reload conversation list to catch missed messages
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
        window.dispatchEvent(new Event('sidebar-shown'));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveConversation]);

  return (
    <div className="h-[100dvh] flex overflow-hidden" style={getWallpaperStyle()}>
      {/* Mobile: show sidebar OR chat, not both */}
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-auto`}>
        <Sidebar />
      </div>
      <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1`}>
        {activeConversationId ? <ChatRoom conversationId={activeConversationId} /> : <EmptyState />}
      </div>
      <CallOverlay />
    </div>
  );
}
