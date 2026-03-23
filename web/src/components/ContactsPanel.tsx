import { useEffect, useState } from 'react';
import { useContactsStore, Contact } from '../stores/contactsStore';
import { useChatStore } from '../stores/chatStore';
import { conversationsApi, usersApi, contactsApi } from '../services/api/endpoints';
import { MessageContextMenu } from './MessageContextMenu';

export function ContactsPanel() {
  const contacts = useContactsStore((s) => s.contacts);
  const loading = useContactsStore((s) => s.loading);
  const fetchContacts = useContactsStore((s) => s.fetchContacts);
  const removeContact = useContactsStore((s) => s.removeContact);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const addConversation = useChatStore((s) => s.addConversation);
  const [phone, setPhone] = useState('+7');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [contactMenu, setContactMenu] = useState<{ x: number; y: number; contact: Contact } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const hasContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddByPhone = async () => {
    if (phone.replace(/[^\d]/g, '').length < 10) {
      setAddError('Введите корректный номер');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const found = await usersApi.lookupByPhones([phone]);
      const users = Array.isArray(found) ? found : [];
      if (users.length === 0) {
        setAddError('Пользователь не найден');
        return;
      }
      await contactsApi.add(users[0].id);
      await fetchContacts();
      setPhone('+7');
    } catch (err: any) {
      setAddError(err?.message?.includes('409') ? 'Уже в контактах' : 'Ошибка');
    } finally {
      setAdding(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!hasContactPicker) return;
    setSyncing(true);
    try {
      const deviceContacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
      const phones: string[] = deviceContacts
        .flatMap((c: any) => c.tel || [])
        .map((t: string) => {
          let p = t.replace(/[^\d+]/g, '');
          if (p.startsWith('8') && p.length === 11) p = '+7' + p.slice(1);
          if (!p.startsWith('+')) p = '+' + p;
          return p;
        })
        .filter((p: string) => p.length >= 10);
      if (phones.length === 0) return;
      const found = await usersApi.lookupByPhones([...new Set(phones)]);
      let added = 0;
      for (const user of (Array.isArray(found) ? found : [])) {
        try { await contactsApi.add(user.id); added++; } catch {}
      }
      await fetchContacts();
      if (added > 0) alert(`Добавлено ${added} контактов`);
    } catch {} finally { setSyncing(false); }
  };

  const handleOpenChat = async (contact: Contact) => {
    try {
      const conv = await conversationsApi.create(contact.userId);
      addConversation(conv as any);
      setActive((conv as any).id);
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    setContactMenu(null);
    if (!window.confirm(`Удалить ${contact.displayName} из контактов?`)) return;
    try {
      await removeContact(contact.userId);
    } catch (err) {
      console.error('Failed to remove contact:', err);
    }
  };

  const isOnline = (userId: string) => onlineUsers.has(userId);

  return (
    <>
      {/* Add by phone */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setAddError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddByPhone()}
            placeholder="+7..."
            className="flex-1 px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleAddByPhone}
            disabled={adding}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {adding ? '...' : 'Добавить'}
          </button>
        </div>
        {addError && <p className="text-xs text-red-400 mt-1">{addError}</p>}
      </div>

      {hasContactPicker && (
        <div className="px-4 pb-2">
          <button
            onClick={handleSyncContacts}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-accent hover:bg-dark-600 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            {syncing ? 'Синхронизация...' : 'Из телефонной книги'}
          </button>
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading && <p className="text-center text-gray-500 text-sm py-4">Загрузка...</p>}
        {!loading && contacts.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">Нет контактов.<br />Добавьте по номеру телефона.</p>
        )}
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-dark-600 rounded-xl transition-colors group"
          >
            {/* Avatar */}
            <div className="relative cursor-pointer" onClick={() => handleOpenChat(contact)}>
              {contact.avatarUrl ? (
                <img src={contact.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-sm font-medium">{contact.displayName[0]?.toUpperCase()}</span>
                </div>
              )}
              {isOnline(contact.userId) && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-800" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenChat(contact)}>
              <p className="text-sm text-white truncate">{contact.displayName}</p>
              {contact.phone && (
                <p className="text-xs text-gray-500 truncate">{contact.phone}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Write message */}
              <button
                onClick={() => handleOpenChat(contact)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-dark-500 text-gray-400 hover:text-accent transition-colors"
                title="Написать"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </button>
              {/* Menu */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setContactMenu({ x: rect.left, y: rect.bottom, contact });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-dark-500 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {contactMenu && (
        <MessageContextMenu
          x={contactMenu.x}
          y={contactMenu.y}
          items={[
            { label: 'Написать', icon: 'reply', onClick: () => { setContactMenu(null); handleOpenChat(contactMenu.contact); } },
            { label: 'Удалить', icon: 'delete', onClick: () => handleDeleteContact(contactMenu.contact), danger: true },
          ]}
          onClose={() => setContactMenu(null)}
        />
      )}
    </>
  );
}
