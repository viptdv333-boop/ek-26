import { useState } from 'react';
import { usersApi, conversationsApi } from '../services/api/endpoints';
import { useChatStore } from '../stores/chatStore';

interface Props {
  onClose: () => void;
}

interface UserResult {
  id: string;
  displayName: string;
  avatarUrl?: string;
  phone?: string;
  telegramUsername?: string;
}

export function NewChatDialog({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const addConversation = useChatStore((s) => s.addConversation);
  const setActive = useChatStore((s) => s.setActiveConversation);

  const handleSearch = async () => {
    if (query.length < 2) {
      setError('Введите имя, @username или номер телефона');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const users = await usersApi.search(query);
      if (!users || users.length === 0) {
        setResults([]);
        setError('Пользователи не найдены');
      } else {
        setResults(users);
      }
    } catch {
      setError('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (user: UserResult) => {
    setLoading(true);
    try {
      const conv = await conversationsApi.create(user.id);
      addConversation(conv);
      setActive(conv.id);
      onClose();
    } catch {
      setError('Ошибка создания чата');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-dark-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Новый чат</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Имя, @username или +7..."
            className="w-full px-4 py-3 bg-dark-800 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {results.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-dark-600 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold flex-shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      user.displayName?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{user.displayName || 'Без имени'}</div>
                    <div className="text-gray-400 text-xs truncate">
                      {user.telegramUsername ? `@${user.telegramUsername}` : user.phone || ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-dark-500 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium transition-colors"
            >
              {loading ? '...' : 'Найти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
