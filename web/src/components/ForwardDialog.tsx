import { useState } from 'react';
import { useChatStore, Conversation } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { wsTransport } from '../services/transport/WebSocketTransport';

interface ForwardMessage {
  text?: string | null;
  senderName?: string;
}

interface Props {
  message: ForwardMessage;
  onClose: () => void;
}

export function ForwardDialog({ message, onClose }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const userId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');

  const getConvName = (conv: Conversation) => {
    if (conv.groupMeta?.name) return conv.groupMeta.name;
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== userId;
    });
    if (!other) return 'Чат';
    return typeof other === 'string' ? 'Пользователь' : other.displayName || 'Пользователь';
  };

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    return getConvName(c).toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = (convId: string) => {
    wsTransport.send('message:send', {
      conversationId: convId,
      type: 'text',
      text: message.text || '',
      forwardedFrom: {
        originalSenderName: message.senderName || 'Неизвестный',
        originalText: message.text || null,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-dark-700 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500">
          <h2 className="text-lg font-semibold text-white">Переслать сообщение</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск чата..."
            className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="max-h-80 overflow-y-auto px-2 pb-3">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleForward(conv.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-600 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-sm font-medium">
                  {conv.type === 'group' ? '#' : getConvName(conv)[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-white truncate">{getConvName(conv)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
