import { useState, useRef, useEffect } from 'react';
import { conversationsApi, usersApi, chatActionsApi } from '../services/api/endpoints';
import { useContactsStore } from '../stores/contactsStore';
import { useChatStore } from '../stores/chatStore';
import { uploadFile } from '../services/api/upload';

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
  isMuted?: boolean;
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [memberMenu, setMemberMenu] = useState<{ userId: string; x: number; y: number } | null>(null);
  const [isMuted, setIsMuted] = useState(!!(conversation as any).isMuted);
  const [muteLoading, setMuteLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const contacts = useContactsStore((s) => s.contacts);

  const admins = new Set(conversation.groupMeta?.admins || []);
  const isAdmin = admins.has(currentUserId);
  const createdBy = conversation.groupMeta?.createdBy;
  const participantIds = new Set(conversation.participants.map((p) => p.id));

  // Close member menu on outside click
  useEffect(() => {
    if (!memberMenu) return;
    const handler = () => setMemberMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [memberMenu]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      setError('Максимальный размер аватара — 5 МБ');
      return;
    }

    setAvatarUploading(true);
    setError('');
    try {
      const att = await uploadFile(file);
      await conversationsApi.updateGroup(conversation.id, { avatarUrl: att.url });
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки аватара');
    } finally {
      setAvatarUploading(false);
    }
  };

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
    setMemberMenu(null);
    if (!confirm('Удалить участника из группы?')) return;
    try {
      await conversationsApi.removeMember(conversation.id, userId);
      onUpdated();
    } catch {
      setError('Ошибка удаления участника');
    }
  };

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    setMemberMenu(null);
    try {
      await conversationsApi.updateAdmin(conversation.id, userId, makeAdmin ? 'add' : 'remove');
      onUpdated();
    } catch {
      setError('Ошибка изменения прав');
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

  const handleToggleMute = async () => {
    setMuteLoading(true);
    try {
      const res = await chatActionsApi.mute(conversation.id);
      setIsMuted((res as any).muted);
      // Also update sidebar state
      const conversations = useChatStore.getState().conversations;
      const updated = conversations.map((c) =>
        c.id === conversation.id ? { ...c, isMuted: (res as any).muted } as any : c
      );
      useChatStore.getState().setConversations(updated);
    } catch {
      setError('Ошибка изменения уведомлений');
    } finally {
      setMuteLoading(false);
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

  const handleMemberClick = (e: React.MouseEvent, userId: string) => {
    if (!isAdmin || userId === currentUserId) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMemberMenu({ userId, x: rect.right - 200, y: rect.bottom });
  };

  // Filter contacts not already in the group for the add member dialog
  const filteredAddContacts = contacts.filter(
    (c) => !participantIds.has(c.userId) && (!addSearch || c.displayName.toLowerCase().includes(addSearch.toLowerCase()) || c.phone?.includes(addSearch))
  );

  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState((conversation.groupMeta as any)?.description || '');
  const groupAvatarUrl = conversation.groupMeta?.avatarUrl;

  const handleSaveDescription = async () => {
    setSaving(true);
    setError('');
    try {
      await conversationsApi.updateGroup(conversation.id, { description: descValue.trim() || null });
      setEditingDesc(false);
      onUpdated();
    } catch {
      setError('Ошибка обновления описания');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-dark-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-600 flex items-center gap-3">
          {/* Group avatar — clickable for admins */}
          <div
            className={`relative w-12 h-12 rounded-xl flex-shrink-0 ${isAdmin ? 'cursor-pointer group' : ''}`}
            onClick={() => isAdmin && avatarInputRef.current?.click()}
            title={isAdmin ? 'Изменить аватар группы' : undefined}
          >
            {groupAvatarUrl ? (
              <img src={groupAvatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <span className="text-accent text-lg font-bold">#</span>
              </div>
            )}
            {isAdmin && (
              <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
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

        {/* Mute toggle */}
        <div className="px-4 py-3 border-b border-dark-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span className="text-sm text-white">Уведомления</span>
          </div>
          <button
            onClick={handleToggleMute}
            disabled={muteLoading}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isMuted ? 'bg-dark-500' : 'bg-accent'
            } ${muteLoading ? 'opacity-50' : ''}`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isMuted ? 'left-0.5' : 'left-[22px]'
              }`}
            />
          </button>
        </div>

        {/* Description */}
        <div className="px-4 py-3 border-b border-dark-600">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Описание</span>
            {isAdmin && !editingDesc && (
              <button onClick={() => setEditingDesc(true)} className="text-gray-400 hover:text-white text-xs">
                {(conversation.groupMeta as any)?.description ? 'Изменить' : 'Добавить'}
              </button>
            )}
          </div>
          {editingDesc ? (
            <div>
              <textarea
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                placeholder="Описание группы..."
                rows={2}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-500 rounded-lg text-white text-sm focus:outline-none focus:border-accent resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button onClick={handleSaveDescription} disabled={saving} className="text-accent text-xs font-medium">{saving ? '...' : 'Сохранить'}</button>
                <button onClick={() => { setEditingDesc(false); setDescValue((conversation.groupMeta as any)?.description || ''); }} className="text-gray-400 text-xs">Отмена</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-300">{(conversation.groupMeta as any)?.description || 'Нет описания'}</p>
          )}
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">Участники</div>

          {/* Add member button */}
          {isAdmin && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-600 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
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
                  <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="w-8 h-8 rounded-xl object-cover" />
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
                  <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-xl object-cover" />
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
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-dark-600/50 transition-colors ${
                isAdmin && p.id !== currentUserId ? 'cursor-pointer' : ''
              }`}
              onClick={(e) => handleMemberClick(e, p.id)}
            >
              <div className="relative w-10 h-10 flex-shrink-0">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-sm font-medium">{p.displayName?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                )}
                {onlineUsers.has(p.id) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-dark-800)]" />
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
                      {p.id === createdBy ? 'Создатель' : 'Админ'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {onlineUsers.has(p.id) ? 'в сети' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Member context menu */}
        {memberMenu && (
          <div
            className="fixed bg-dark-600 rounded-xl shadow-2xl border border-dark-500 py-1 z-[60] min-w-[200px]"
            style={{ left: memberMenu.x, top: memberMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {!admins.has(memberMenu.userId) && (
              <button
                onClick={() => handleToggleAdmin(memberMenu.userId, true)}
                className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-dark-500 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Назначить админом
              </button>
            )}
            {admins.has(memberMenu.userId) && memberMenu.userId !== createdBy && (
              <button
                onClick={() => handleToggleAdmin(memberMenu.userId, false)}
                className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-dark-500 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zM12 12.75h.007v.008H12v-.008z" />
                </svg>
                Снять админа
              </button>
            )}
            <button
              onClick={() => handleRemoveMember(memberMenu.userId)}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-dark-500 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              Удалить из группы
            </button>
          </div>
        )}

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
