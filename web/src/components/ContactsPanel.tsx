import { useEffect, useState } from 'react';
import { useContactsStore, Contact } from '../stores/contactsStore';
import { useChatStore } from '../stores/chatStore';
import { conversationsApi, usersApi, contactsApi } from '../services/api/endpoints';
import { AddContactDialog } from './AddContactDialog';

export function ContactsPanel() {
  const contacts = useContactsStore((s) => s.contacts);
  const loading = useContactsStore((s) => s.loading);
  const fetchContacts = useContactsStore((s) => s.fetchContacts);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const addConversation = useChatStore((s) => s.addConversation);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const hasContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

  const handleSyncContacts = async () => {
    if (!hasContactPicker) {
      alert('Синхронизация контактов доступна только в Chrome на Android');
      return;
    }
    setSyncing(true);
    try {
      const deviceContacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
      const phones: string[] = deviceContacts
        .flatMap((c: any) => c.tel || [])
        .map((t: string) => {
          let phone = t.replace(/[^\d+]/g, '');
          if (phone.startsWith('8') && phone.length === 11) phone = '+7' + phone.slice(1);
          if (!phone.startsWith('+')) phone = '+' + phone;
          return phone;
        })
        .filter((p: string) => p.length >= 10);

      if (phones.length === 0) {
        alert('Не найдено номеров телефонов');
        return;
      }

      const found = await usersApi.lookupByPhones([...new Set(phones)]);
      let added = 0;
      for (const user of (Array.isArray(found) ? found : [])) {
        try {
          await contactsApi.add(user.id);
          added++;
        } catch { /* 409 already exists */ }
      }
      await fetchContacts();
      alert(`Найдено ${(found as any[]).length} пользователей, добавлено ${added} новых контактов`);
    } catch (err) {
      console.error('Contact sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filtered = contacts.filter((c) =>
    !search || c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const handleOpenChat = async (contact: Contact) => {
    try {
      const conv = await conversationsApi.create(contact.userId);
      addConversation(conv as any);
      setActive((conv as any).id);
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const isOnline = (userId: string) => onlineUsers.has(userId);

  return (
    <>
      {/* Search */}
      <div className="px-4 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск..."
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Add contact button */}
      <div className="px-4 py-1">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-accent hover:bg-dark-600 rounded-lg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
          Добавить контакт
        </button>
        {hasContactPicker && (
          <button
            onClick={handleSyncContacts}
            disabled={syncing}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-accent hover:bg-dark-600 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            {syncing ? 'Синхронизация...' : 'Синхронизировать контакты'}
          </button>
        )}
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading && <p className="text-center text-gray-500 text-sm py-4">Загрузка...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">Нет контактов</p>
        )}
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => handleOpenChat(contact)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-600 rounded-xl transition-colors"
          >
            <div className="relative">
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
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm text-white truncate">{contact.displayName}</p>
              {contact.phone && (
                <p className="text-xs text-gray-500 truncate">{contact.phone}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {showAdd && <AddContactDialog onClose={() => { setShowAdd(false); fetchContacts(); }} />}
    </>
  );
}
