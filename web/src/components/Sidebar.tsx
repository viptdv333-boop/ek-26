import { useState } from 'react';
import { useChatStore, Conversation } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { NewChatDialog } from './NewChatDialog';
import { PhoneLinkDialog } from './PhoneLinkDialog';
import { SettingsModal } from './SettingsModal';
import { ContactsPanel } from './ContactsPanel';

export function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);
  const authLogout = useAuthStore((s) => s.logout);
  const resetChat = useChatStore((s) => s.reset);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showPhoneLink, setShowPhoneLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
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

  const getOtherUser = (conv: Conversation) => {
    if (conv.type !== 'direct') return null;
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== user?.id;
    });
    if (!other || typeof other === 'string') return null;
    return other;
  };

  const getOtherUserId = (conv: Conversation): string | null => {
    const other = getOtherUser(conv);
    return other?.id || null;
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
    <div className="w-full md:w-80 flex-shrink-0 border-r border-dark-600 flex flex-col bg-dark-800">
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
            onClick={() => { resetChat(); authLogout(); }}
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
      {/* Tabs */}
      <div className="flex border-b border-dark-600">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'chats' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'
          }`}
        >
          Чаты
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'contacts' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'
          }`}
        >
          Контакты
        </button>
      </div>

      {activeTab === 'contacts' ? (
        <ContactsPanel />
      ) : (
      <>
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
              <div className="relative w-10 h-10 flex-shrink-0">
                {!isGroup && getOtherUser(conv)?.avatarUrl ? (
                  <img src={getOtherUser(conv)!.avatarUrl!} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-sm font-medium">
                      {isGroup ? '#' : name[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
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
      </>
      )}

      {/* User info */}
      <div className="px-4 py-3 border-t border-dark-600">
        <div className="flex items-center">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover mr-3" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center mr-3">
              <span className="text-accent text-xs font-medium">{user?.displayName?.[0]?.toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-300 truncate block">{user?.displayName}</span>
            {user?.phone ? (
              <span className="text-xs text-gray-500 truncate block">{user.phone}</span>
            ) : (
              <button
                onClick={() => setShowPhoneLink(true)}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Привязать телефон
              </button>
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition-colors"
            title="Настройки"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.004.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {showNewChat && <NewChatDialog onClose={() => setShowNewChat(false)} />}
      {showPhoneLink && <PhoneLinkDialog onClose={() => setShowPhoneLink(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
