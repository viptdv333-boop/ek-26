import { useState } from 'react';
import { usersApi } from '../services/api/endpoints';
import { useContactsStore } from '../stores/contactsStore';

interface Props {
  onClose: () => void;
}

interface SearchResult {
  id: string;
  displayName: string;
  phone: string | null;
  avatarUrl: string | null;
  telegramUsername?: string | null;
}

export function AddContactDialog({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const addContact = useContactsStore((s) => s.addContact);
  const contacts = useContactsStore((s) => s.contacts);

  const existingIds = new Set(contacts.map((c) => c.userId));

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const users = await usersApi.search(q);
      setResults(Array.isArray(users) ? users : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (user: SearchResult) => {
    try {
      await addContact(user.id);
      setAdded((prev) => new Set(prev).add(user.id));
    } catch (err: any) {
      if (err.message?.includes('409')) {
        setAdded((prev) => new Set(prev).add(user.id));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-dark-700 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500">
          <h2 className="text-lg font-semibold text-white">Добавить контакт</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3">
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Имя, @username или телефон..."
            autoFocus
            className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="max-h-80 overflow-y-auto px-2 pb-3">
          {searching && <p className="text-center text-gray-500 text-sm py-4">Поиск...</p>}
          {!searching && query.length >= 2 && results.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">Никого не найдено</p>
          )}
          {results.map((user) => {
            const isAdded = added.has(user.id) || existingIds.has(user.id);
            return (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-dark-600 rounded-xl">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-sm font-medium">{user.displayName[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.phone || (user.telegramUsername ? `@${user.telegramUsername}` : '')}
                  </p>
                </div>
                {isAdded ? (
                  <span className="text-xs text-green-400">Добавлен ✓</span>
                ) : (
                  <button
                    onClick={() => handleAdd(user)}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors"
                  >
                    Добавить
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
