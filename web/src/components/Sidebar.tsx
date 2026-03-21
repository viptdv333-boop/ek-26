import { useState } from 'react';
import { useChatStore, Conversation } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { NewChatDialog } from './NewChatDialog';

export function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showNewChat, setShowNewChat] = useState(false);
  const [search, setSearch] = useState('');

  const getConversationName = (conv: Conversation): string => {
    if (conv.groupMeta?.name) return conv.groupMeta.name;
    // Direct chat — find the other participant
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== user?.id;
    });
    if (!other) return 'Чат';
    if (typeof other === 'string') return 'Пользователь';
    return other.displayName || 'Пользователь';
  };

  const getOtherUserId = (conv: Conversation): string | null => {
    if (conv.type !== 'direct') return null;
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== user?.id;
    });
    if (!other) return null;
    return typeof other === 'string' ? other : other.id;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  const filtered = search
    ? conversations.filter((c) => getConversationName(c).toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div className="w-80 flex-shrink-0 border-r border-dark-600 flex flex-col bg-dark-800">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-dark-600">
        <h1 className="text-lg font-semibold text-white">FOMO Chat</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
            title="Новый чат"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
            title="Выйти"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск..."
          className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            {search ? 'Ничего не найдено' : 'Нет чатов. Начните новый разговор.'}
          </div>
        )}
        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          const name = getConversationName(conv);
          const otherUserId = getOtherUserId(conv);
          const isOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
          const isGroup = conv.type === 'group';

          return (
            <button
              key={conv.id}
              onClick={() => setActive(conv.id)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-700 transition-colors text-left ${
                isActive ? 'bg-dark-600' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative w-10 h-10 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                <span className="text-accent text-sm font-medium">
                  {isGroup ? '#' : name[0]?.toUpperCase() || '?'}
                </span>
                {!isGroup && isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-800" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-white truncate">{name}</span>
                  {conv.lastMessage && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessage.text}</p>
                )}
              </div>
              {/* Unread badge */}
              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-medium">{conv.unreadCount}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* User info */}
      <div className="h-14 px-4 flex items-center border-t border-dark-600">
        <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center mr-3">
          <span className="text-accent text-xs font-medium">{user?.displayName?.[0]?.toUpperCase()}</span>
        </div>
        <span className="text-sm text-gray-300 truncate">{user?.displayName}</span>
      </div>

      {showNewChat && <NewChatDialog onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
