import { useState, useEffect } from 'react';
import { conversationsApi, usersApi } from '../services/api/endpoints';
import { useContactsStore } from '../stores/contactsStore';
import { useChatStore } from '../stores/chatStore';

interface Participant {
  id: string;
  displayName: string;
  avatarUrl?: string;
  phone?: string;
}

interface GroupMeta {
  name: string;
  avatarUrl?: string;
  admins: string[];
  createdBy: string;
}

interface Conversation {
  id: string;
  type: string;
  participants: Participant[];
  groupMeta?: GroupMeta;
}

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function GroupInfoPanel({ conversation, currentUserId, onClose, onUpdated }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(conversation.groupMeta?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<Participant[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const contacts = useContactsStore((s) => s.contacts);

  const admins = new Set(conversation.groupMeta?.admins || []);
  const isAdmin = admins.has(currentUserId);
  const participantIds = new Set(conversation.participants.map((p) => p.id));

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === conversation.groupMeta?.name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await conversationsApi.updateGroup(conversation.id, { name: nameValue.trim() });
      setEditingName(false);
      onUpdated();
    } catch {
      setError('Ошибка обновления');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Удалить участника из группы?')) return;
    try {
      await conversationsApi.removeMember(conversation.id, userId);
      onUpdated();
    } catch {
      setError('Ошибка удаления участника');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Вы уверены, что хотите покинуть группу?')) return;
    try {
      await conversationsApi.removeMember(conversation.id, currentUserId);
      onClose();
      onUpdated();
    } catch {
      setError('Ошибка выхода из группы');
    }
  };

  const handleAddSearch = async () => {
    if (addSearch.length < 2) return;
    setAddLoading(true);
    try {
      const results = await usersApi.search(addSearch);
      // Filter out existing participants
      setAddSearchResults((results || []).filter((u: Participant) => !participantIds.has(u.id)));
    } catch {
      setError('Ошибка поиска');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setAddLoading(true);
    try {
      await conversationsApi.addMembers(conversation.id, [userId]);
      setShowAddMember(false);
      setAddSearch('');
      setAddSearchResults([]);
      onUpdated();
    } catch {
      setError('Ошибка добавления');
    } finally {
      setAddLoading(false);
    }
  };

  // Filter contacts not already in the group for the add member dialog
  const filteredAddContacts = contacts.filter(
    (c) => !participantIds.has(c.userId) && (!addSearch || c.displayName.toLowerCase().includes(addSearch.toLowerCase()) || c.phone?.includes(addSearch))
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-dark-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-600 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-lg font-bold">#</span>
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="flex-1 px-2 py-1 bg-dark-800 border border-dark-500 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="text-accent hover:text-white text-sm font-medium"
                >
                  {saving ? '...' : 'OK'}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameValue(conversation.groupMeta?.name || ''); }}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white truncate">{conversation.groupMeta?.name || 'Группа'}</h2>
                {isAdmin && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Изменить название"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400">{conversation.participants.length} участников</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 text-red-400 text-sm text-center">{error}</div>
        )}

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">Участники</div>

          {/* Add member button */}
          {isAdmin && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-600 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-sm text-accent font-medium">Добавить участника</span>
            </button>
          )}

          {/* Add member search section */}
          {showAddMember && (
            <div className="px-4 py-2 border-b border-dark-600">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => { setAddSearch(e.target.value); setAddSearchResults([]); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSearch()}
                  placeholder="Поиск пользователей..."
                  className="flex-1 px-3 py-2 bg-dark-800 border border-dark-500 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
                  autoFocus
                />
                <button
                  onClick={handleAddSearch}
                  disabled={addLoading || addSearch.length < 2}
                  className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-white text-sm"
                >
                  {addLoading ? '...' : 'Найти'}
                </button>
              </div>

              {/* Contacts not in group */}
              {filteredAddContacts.map((c) => (
                <button
                  key={c.userId}
                  onClick={() => handleAddMember(c.userId)}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-dark-600 rounded-lg transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-accent text-xs font-medium">{c.displayName[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm text-white truncate">{c.displayName}</span>
                </button>
              ))}

              {/* Search results */}
              {addSearchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleAddMember(u.id)}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-dark-600 rounded-lg transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-accent text-xs font-medium">{u.displayName?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <span className="text-sm text-white truncate">{u.displayName || 'Без имени'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Participant list */}
          {conversation.participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-dark-600/50 transition-colors"
            >
              <div className="relative w-10 h-10 flex-shrink-0">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-sm font-medium">{p.displayName?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                )}
                {onlineUsers.has(p.id) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white truncate">
                    {p.displayName || 'Без имени'}
                    {p.id === currentUserId && <span className="text-gray-500"> (вы)</span>}
                  </span>
                  {admins.has(p.id) && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-medium">
                      Админ
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {onlineUsers.has(p.id) ? 'в сети' : ''}
                </p>
              </div>
              {isAdmin && p.id !== currentUserId && (
                <button
                  onClick={() => handleRemoveMember(p.id)}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                  title="Удалить из группы"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Leave group button */}
        <div className="p-4 border-t border-dark-600">
          <button
            onClick={handleLeaveGroup}
            className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            Покинуть группу
          </button>
        </div>
      </div>
    </div>
  );
}
