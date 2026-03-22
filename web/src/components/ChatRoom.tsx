import { useState, useEffect, useRef, useMemo } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { messagesApi } from '../services/api/endpoints';
import { wsTransport } from '../services/transport/WebSocketTransport';
import { MessageBubble } from './MessageBubble';
import { sessionManager, messageCache } from '../services/crypto';

const EMPTY_ARRAY: string[] = [];

interface Props {
  conversationId: string;
}

export function ChatRoom({ conversationId }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useChatStore((s) => s.messages[conversationId]) || EMPTY_ARRAY;
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const conversations = useChatStore((s) => s.conversations);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]) || EMPTY_ARRAY;
  const isUserOnline = useChatStore((s) => s.isUserOnline);
  const userId = useAuthStore((s) => s.user?.id);

  const conv = conversations.find((c) => c.id === conversationId);

  const getTitle = () => {
    if (conv?.groupMeta?.name) return conv.groupMeta.name;
    if (!conv) return 'Чат';
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== userId;
    });
    if (!other) return 'Чат';
    return typeof other === 'string' ? 'Пользователь' : other.displayName || 'Пользователь';
  };

  const getSubtitle = () => {
    if (typingUsers.length > 0) return 'печатает...';
    if (conv?.type === 'group') {
      return `${conv.participants.length} участников`;
    }
    const other = conv?.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== userId;
    });
    const otherId = other ? (typeof other === 'string' ? other : other.id) : null;
    if (otherId && isUserOnline(otherId)) return 'в сети';
    return null;
  };

  const title = getTitle();
  const subtitle = getSubtitle();

  useEffect(() => {
    setLoading(true);
    messagesApi.list(conversationId).then(async (res) => {
      const list = Array.isArray(res) ? res : res.messages ?? [];
      // Normalize: API returns sender.id, store expects senderId
      const normalized = await Promise.all(list.map(async (m: any) => {
        let text = m.text;
        const encrypted = m.encrypted || false;
        if (encrypted && m.envelope) {
          try {
            const cached = await messageCache.get(m.id);
            if (cached) {
              text = cached;
            } else {
              const senderId = m.senderId || m.sender?.id || '';
              text = await sessionManager.decryptMessage(senderId, m.envelope);
              await messageCache.put(m.id, text);
            }
          } catch {
            text = '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u0437\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043e';
          }
        }
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId || m.sender?.id || '',
          senderName: m.senderName || m.sender?.displayName || '',
          type: m.type,
          text,
          encrypted,
          status: m.status,
          createdAt: m.createdAt,
        };
      }));
      setMessages(conversationId, normalized.reverse());
    }).catch(() => {}).finally(() => setLoading(false));
  }, [conversationId, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');

    // Try E2EE for direct chats, fallback to plaintext on any error
    let sent = false;

    if (conv?.type === 'direct') {
      const other = conv.participants.find((p) => {
        const id = typeof p === 'string' ? p : p.id;
        return id !== userId;
      });
      const recipientId = other ? (typeof other === 'string' ? other : other.id) : null;

      if (recipientId) {
        try {
          const envelope = await sessionManager.encryptMessage(recipientId, trimmed);
          wsTransport.setPendingText(conversationId, trimmed);
          if (wsTransport.connected) {
            wsTransport.send('message:send', { conversationId, type: 'text', encrypted: true, envelope });
          } else {
            await messagesApi.send(conversationId, { type: 'text', encrypted: true, envelope } as any);
          }
          sent = true;
        } catch (err) {
          console.warn('E2EE failed, sending plaintext:', err);
        }
      }
    }

    if (!sent) {
      // Plaintext fallback (groups, no keys, or encryption error)
      if (wsTransport.connected) {
        wsTransport.send('message:send', { conversationId, type: 'text', text: trimmed });
      } else {
        try {
          const msg = await messagesApi.send(conversationId, { type: 'text', text: trimmed });
          addMessage(conversationId, msg);
        } catch (err) {
          console.error('Send error:', err);
          setText(trimmed);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    wsTransport.send('typing:start', { conversationId });
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-900">
      {/* Header */}
      <div className="h-14 px-6 flex items-center border-b border-dark-600 bg-dark-800">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center mr-3">
          <span className="text-accent text-sm font-medium">
            {conv?.type === 'group' ? '#' : title[0]?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-medium text-white">{title}</h2>
          {subtitle && (
            <span className={`text-xs ${typingUsers.length > 0 ? 'text-accent' : 'text-gray-400'}`}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {loading && (
          <div className="text-center text-gray-500 text-sm py-4">Загрузка...</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            Нет сообщений. Напишите первое!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.senderId === userId}
            showSender={conv?.type === 'group'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-dark-600 bg-dark-800">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-dark-700 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-accent transition-colors"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
