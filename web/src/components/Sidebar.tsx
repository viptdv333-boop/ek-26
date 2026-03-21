import { useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { NewChatDialog } from './NewChatDialog';

export function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showNewChat, setShowNewChat] = useState(false);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="w-80 flex-shrink-0 border-r border-dark-600 flex flex-col bg-dark-800">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-dark-600">
        <h1 className="text-lg font-semibold text-white">ЭК-26</h1>
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
          placeholder="Поиск..."
          className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            Нет чатов. Начните новый разговор.
          </div>
        )}
        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          const name = conv.groupMeta?.name || conv.participants.find((p) => p !== user?.id) || 'Чат';
          return (
            <button
              key={conv.id}
              onClick={() => setActive(conv.id)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-700 transition-colors text-left ${
                isActive ? 'bg-dark-600' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                <span className="text-accent text-sm font-medium">
                  {(typeof name === 'string' ? name : '?')[0]?.toUpperCase()}
                </span>
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
