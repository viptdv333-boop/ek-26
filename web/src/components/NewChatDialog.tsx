import { useState, useEffect } from 'react';
import { usersApi, conversationsApi } from '../services/api/endpoints';
import { useChatStore } from '../stores/chatStore';
import { useContactsStore, Contact } from '../stores/contactsStore';

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
  const contacts = useContactsStore((s) => s.contacts);
  const fetchContacts = useContactsStore((s) => s.fetchContacts);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const addConversation = useChatStore((s) => s.addConversation);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const filteredContacts = contacts.filter((c) =>
    !search || c.displayName.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  const handleSearch = async () => {
    if (search.length < 2) return;
    setLoading(true);
    setError('');
    try {
      const users = await usersApi.search(search);
      setSearchResults(users || []);
      if (!users || users.length === 0) setError('Не найдено');
    } catch {
      setError('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (userId: string) => {
    setLoading(true);
    try {
      const conv = await conversationsApi.create(userId);
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
        className="w-full max-w-sm bg-dark-700 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-dark-600">
          <h2 className="text-lg font-semibold text-white mb-3">Новый чат</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchResults([]); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск по контактам или +7..."
            className="w-full px-4 py-2.5 bg-dark-800 border border-dark-500 rounded-xl text-white text-sm focus:outline-none focus:border-accent transition-colors"
            autoFocus
          />
        </div>

        {/* Contact list or search results */}
        <div className="flex-1 overflow-y-auto py-1">
          {/* Show contacts when no search or search matches contacts */}
          {searchResults.length === 0 && filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => handleSelect(contact.userId)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-600 transition-colors text-left"
            >
              <div className="relative w-10 h-10 flex-shrink-0">
                {contact.avatarUrl ? (
                  <img src={contact.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-sm font-medium">{contact.displayName[0]?.toUpperCase()}</span>
                  </div>
                )}
                {onlineUsers.has(contact.userId) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-700" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{contact.displayName}</p>
                {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
              </div>
            </button>
          ))}

          {/* Search results from server */}
          {searchResults.length > 0 && searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-600 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-accent text-sm font-medium">{user.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{user.displayName || 'Без имени'}</p>
                <p className="text-xs text-gray-500">{user.phone || ''}</p>
              </div>
            </button>
          ))}

          {filteredContacts.length === 0 && searchResults.length === 0 && !error && (
            <p className="text-center text-gray-500 text-sm py-8">
              {search ? 'Нет совпадений в контактах' : 'Нет контактов'}
            </p>
          )}

          {error && <p className="text-center text-red-400 text-sm py-4">{error}</p>}
        </div>

        {/* Bottom buttons */}
        <div className="p-4 border-t border-dark-600 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-dark-500 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Отмена
          </button>
          {search.length >= 2 && searchResults.length === 0 && (
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium transition-colors text-sm"
            >
              {loading ? '...' : 'Искать на сервере'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
