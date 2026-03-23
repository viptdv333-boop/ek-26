import { useEffect, useState } from 'react';
import { useContactsStore, Contact } from '../stores/contactsStore';
import { useChatStore } from '../stores/chatStore';
import { conversationsApi, usersApi, contactsApi, chatActionsApi } from '../services/api/endpoints';
import { MessageContextMenu } from './MessageContextMenu';
import { ContactCard } from './ContactCard';

export function ContactsPanel() {
  const contacts = useContactsStore((s) => s.contacts);
  const loading = useContactsStore((s) => s.loading);
  const fetchContacts = useContactsStore((s) => s.fetchContacts);
  const removeContact = useContactsStore((s) => s.removeContact);
  const updateContact = useContactsStore((s) => s.updateContact);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const addConversation = useChatStore((s) => s.addConversation);
  const [phone, setPhone] = useState('+');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [contactMenu, setContactMenu] = useState<{ x: number; y: number; contact: Contact } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

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
      setPhone('+');
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

  const handleToggleFavorite = async (contact: Contact) => {
    setContactMenu(null);
    try {
      await updateContact(contact.userId, { isFavorite: !contact.isFavorite });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleBlockContact = async (contact: Contact) => {
    setContactMenu(null);
    await new Promise(r => setTimeout(r, 100));
    if (!window.confirm(`Заблокировать ${contact.displayName}?`)) return;
    try {
      await chatActionsApi.block(contact.userId);
    } catch (err) {
      console.error('Failed to block contact:', err);
    }
  };

  const handleEditContact = (contact: Contact) => {
    setContactMenu(null);
    setEditingContact(contact);
  };

  const isOnline = (userId: string) => onlineUsers.has(userId);

  // Sort: favorites first (max 5), then alphabetically
  const sortedContacts = [...contacts].sort((a, b) => {
    const aFav = a.isFavorite ? 1 : 0;
    const bFav = b.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return (a.displayName || '').localeCompare(b.displayName || '', 'ru');
  });

  return (
    <>
      {/* Add by phone */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setAddError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddByPhone()}
            placeholder="Номер телефона..."
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
        {sortedContacts.map((contact) => (
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
              <p className="text-sm text-white truncate flex items-center gap-1">
                {contact.isFavorite && <span className="text-yellow-400 flex-shrink-0">&#11088;</span>}
                {contact.displayName}
              </p>
              {contact.phone && (
                <p className="text-xs text-gray-500 truncate">{contact.phone}</p>
              )}
            </div>

            {/* Actions - only menu button */}
            <div className="flex items-center gap-1">
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
            { label: 'Изменить', icon: 'edit', onClick: () => handleEditContact(contactMenu.contact) },
            { label: contactMenu.contact.isFavorite ? 'Из избранного' : 'В избранное', icon: 'star', onClick: () => handleToggleFavorite(contactMenu.contact) },
            { label: 'Заблокировать', icon: 'block', onClick: () => handleBlockContact(contactMenu.contact) },
            { label: 'Удалить', icon: 'delete', onClick: () => handleDeleteContact(contactMenu.contact), danger: true },
          ]}
          onClose={() => setContactMenu(null)}
        />
      )}

      {editingContact && (
        <ContactCard contact={editingContact} onClose={() => setEditingContact(null)} />
      )}
    </>
  );
}
