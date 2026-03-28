import { useEffect, useState, useRef } from 'react';
import { useContactsStore, Contact } from '../stores/contactsStore';
import { useChatStore } from '../stores/chatStore';
import { conversationsApi, usersApi, contactsApi, chatActionsApi } from '../services/api/endpoints';
import { MessageContextMenu } from './MessageContextMenu';
import { ContactCard } from './ContactCard';
import { useTranslation } from '../i18n';

interface SyncResult {
  name: string;
  phone: string;
  userId?: string;
  avatarUrl?: string;
  registered: boolean;
}

function formatLastSeen(lastSeen: string | null, t: (key: string, params?: Record<string, string | number>) => string): string | null {
  if (!lastSeen) return null;
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t('contacts.justNow');
  if (minutes < 60) return t('contacts.minutesAgo', { n: minutes });
  if (hours < 24) return t('contacts.hoursAgo', { n: hours });
  if (days < 30) return t('contacts.daysAgo', { n: days });
  return t('contacts.longAgo');
}

export function ContactsPanel() {
  const { t } = useTranslation();
  const contacts = useContactsStore((s) => s.contacts);
  const loading = useContactsStore((s) => s.loading);
  const fetchContacts = useContactsStore((s) => s.fetchContacts);
  const removeContact = useContactsStore((s) => s.removeContact);
  const updateContact = useContactsStore((s) => s.updateContact);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const addConversation = useChatStore((s) => s.addConversation);
  const [contactMenu, setContactMenu] = useState<{ x: number; y: number; contact: Contact } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add contact dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addPhone, setAddPhone] = useState('+');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; displayName: string; phone: string | null; avatarUrl: string | null }[]>([]);
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [noAccountFound, setNoAccountFound] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const hasContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Live search as user types phone
  useEffect(() => {
    const q = addPhone.replace(/^\+$/, '');
    if (q.length < 3) {
      setSearchResults([]);
      setNoAccountFound(false);
      return;
    }
    setSearchingPhone(true);
    setNoAccountFound(false);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const users = await usersApi.search(q);
        const results = Array.isArray(users) ? users : [];
        setSearchResults(results);
        const digits = addPhone.replace(/[^\d]/g, '');
        if (results.length === 0 && digits.length >= 10) {
          setNoAccountFound(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingPhone(false);
      }
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [addPhone]);

  const handlePhoneChange = (value: string) => {
    // Only allow + and digits
    const filtered = value.replace(/[^+\d]/g, '');
    setAddPhone(filtered || '+');
    setAddError('');
    setNoAccountFound(false);
  };

  const handleAddByPhone = async () => {
    if (addPhone.replace(/[^\d]/g, '').length < 10) {
      setAddError(t('contacts.invalidPhone'));
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const found = await usersApi.lookupByPhones([addPhone]);
      const users = Array.isArray(found) ? found : [];
      if (users.length === 0) {
        setAddError(t('contacts.notFound'));
        setNoAccountFound(true);
        return;
      }
      await contactsApi.add(users[0].id);
      await fetchContacts();
      setAddPhone('+');
      setShowAddDialog(false);
      showToast(t('contacts.addedToast'));
    } catch (err: any) {
      setAddError(err?.message?.includes('409') ? t('contacts.alreadyAdded') : t('contacts.error'));
    } finally {
      setAdding(false);
    }
  };

  const handleInvite = (phoneNum: string) => {
    const text = encodeURIComponent(t('contacts.inviteText'));
    window.open(`sms:${phoneNum}?body=${text}`, '_self');
  };

  const handleSyncContacts = async () => {
    if (!hasContactPicker) return;
    setSyncing(true);
    setSyncResults(null);
    try {
      const deviceContacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
      const phoneMap = new Map<string, string>();
      for (const c of deviceContacts) {
        const name = c.name?.[0] || '';
        for (const tel of (c.tel || [])) {
          let p = tel.replace(/[^\d+]/g, '');
          if (p.startsWith('8') && p.length === 11) p = '+7' + p.slice(1);
          if (!p.startsWith('+')) p = '+' + p;
          if (p.length >= 10) phoneMap.set(p, name);
        }
      }
      if (phoneMap.size === 0) return;
      const phones = [...phoneMap.keys()];
      const found = await usersApi.lookupByPhones(phones);
      const foundPhones = new Set((Array.isArray(found) ? found : []).map((u: any) => u.phone));

      let addedCount = 0;
      for (const user of (Array.isArray(found) ? found : [])) {
        try {
          await contactsApi.add(user.id);
          addedCount++;
        } catch {}
      }
      if (addedCount > 0) await fetchContacts();

      const registered: SyncResult[] = [];
      const unregistered: SyncResult[] = [];
      for (const user of (Array.isArray(found) ? found : [])) {
        registered.push({
          name: phoneMap.get(user.phone) || user.displayName,
          phone: user.phone,
          userId: user.id,
          avatarUrl: user.avatarUrl,
          registered: true,
        });
      }
      for (const [ph, name] of phoneMap) {
        if (!foundPhones.has(ph)) {
          unregistered.push({ name, phone: ph, registered: false });
        }
      }
      registered.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      unregistered.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      setSyncResults([...registered, ...unregistered]);
    } catch {} finally { setSyncing(false); }
  };

  const handleAddSyncedContact = async (userId: string) => {
    try {
      await contactsApi.add(userId);
      await fetchContacts();
      setSyncResults(prev => prev?.map(r => r.userId === userId ? { ...r, userId: undefined } : r) || null);
      showToast(t('contacts.addedToast'));
    } catch {}
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
    if (!window.confirm(t('contacts.deleteConfirm', { name: contact.displayName }))) return;
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
    if (!window.confirm(t('contacts.blockConfirm', { name: contact.displayName }))) return;
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

  const sortedContacts = [...contacts].sort((a, b) => {
    const aFav = a.isFavorite ? 1 : 0;
    const bFav = b.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return (a.displayName || '').localeCompare(b.displayName || '', 'ru');
  });

  const syncRegistered = syncResults?.filter(r => r.registered) || [];
  const syncUnregistered = syncResults?.filter(r => !r.registered) || [];

  return (
    <>
      {hasContactPicker && (
        <div className="px-4 py-2">
          <button
            onClick={handleSyncContacts}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-accent hover:bg-dark-600 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            {syncing ? t('contacts.syncing') : t('contacts.syncFromPhone')}
          </button>
        </div>
      )}

      {/* Sync results - sorted: registered first, then unregistered */}
      {syncResults && syncResults.length > 0 && (
        <div className="px-2 pb-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs text-gray-500">{t('contacts.syncFromPhone')} ({syncResults.length})</span>
            <button onClick={() => setSyncResults(null)} className="text-xs text-gray-500 hover:text-white">&times;</button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {syncRegistered.length > 0 && (
              <>
                <p className="text-xs text-green-400 px-3 py-1 font-medium">{t('contacts.registered')} ({syncRegistered.length})</p>
                {syncRegistered.map((r, i) => (
                  <div key={`reg-${i}`} className="flex items-center gap-3 px-3 py-2 bg-dark-700 rounded-xl">
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-dark-500 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">{r.name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{r.name || r.phone}</p>
                      <p className="text-xs text-gray-500 truncate">{r.phone}</p>
                    </div>
                    {r.userId ? (
                      <button
                        onClick={() => handleAddSyncedContact(r.userId!)}
                        className="px-2 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg"
                      >
                        {t('contacts.add')}
                      </button>
                    ) : (
                      <span className="text-xs text-green-400">{t('contacts.added')} ✓</span>
                    )}
                  </div>
                ))}
              </>
            )}
            {syncUnregistered.length > 0 && (
              <>
                <p className="text-xs text-gray-400 px-3 py-1 font-medium mt-2">{t('contacts.notRegistered')} ({syncUnregistered.length})</p>
                {syncUnregistered.map((r, i) => (
                  <div key={`unreg-${i}`} className="flex items-center gap-3 px-3 py-2 bg-dark-700 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-dark-500 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">{r.name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{r.name || r.phone}</p>
                      <p className="text-xs text-gray-500 truncate">{r.phone}</p>
                    </div>
                    <button
                      onClick={() => handleInvite(r.phone)}
                      className="px-2 py-1 bg-dark-500 hover:bg-dark-400 text-gray-300 text-xs rounded-lg"
                    >
                      {t('contacts.invite')}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading && <p className="text-center text-gray-500 text-sm py-4">{t('contacts.loading')}</p>}
        {!loading && contacts.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">{t('contacts.noContacts')}</p>
        )}
        {sortedContacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-dark-600 rounded-xl transition-colors group"
          >
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

            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenChat(contact)}>
              <p className="text-sm text-white truncate flex items-center gap-1">
                {contact.isFavorite && <span className="text-yellow-400 flex-shrink-0">&#11088;</span>}
                {contact.displayName}
              </p>
              {contact.phone && (
                <p className="text-xs text-gray-500 truncate">{contact.phone}</p>
              )}
              {isOnline(contact.userId) ? (
                <p className="text-xs text-green-400">{t('contacts.online')}</p>
              ) : (
                (() => {
                  const status = formatLastSeen(contact.lastSeen, t);
                  return status ? <p className="text-xs text-gray-500">{status}</p> : null;
                })()
              )}
            </div>

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

      {/* Add Contact button at bottom */}
      <div className="px-4 py-3 border-t border-dark-600">
        <button
          onClick={() => { setShowAddDialog(true); setAddPhone('+'); setAddError(''); setSearchResults([]); setNoAccountFound(false); }}
          className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          {t('contacts.addContact')}
        </button>
      </div>

      {/* Add Contact Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddDialog(false)}>
          <div
            className="w-full max-w-sm bg-dark-700 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-dark-600">
              <h2 className="text-lg font-semibold text-white mb-3">{t('contacts.addContact')}</h2>
              <div className="flex gap-2">
                <input
                  value={addPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddByPhone()}
                  placeholder={t('contacts.enterNumber')}
                  className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-500 rounded-xl text-white text-sm focus:outline-none focus:border-accent transition-colors"
                  autoFocus
                  inputMode="tel"
                />
                <button
                  onClick={handleAddByPhone}
                  disabled={adding}
                  className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {adding ? '...' : t('contacts.add')}
                </button>
              </div>
              {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}
              {searchingPhone && <p className="text-xs text-gray-500 mt-1">{t('contacts.searching')}</p>}
            </div>

            <div className="flex-1 overflow-y-auto py-1 max-h-64">
              {/* Search results */}
              {searchResults.map((user) => {
                const alreadyAdded = contacts.some(c => c.userId === user.id);
                return (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-dark-600 transition-colors">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-accent text-sm font-medium">{user.displayName[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{user.displayName}</p>
                      {user.phone && <p className="text-xs text-gray-500 truncate">{user.phone}</p>}
                    </div>
                    {alreadyAdded ? (
                      <span className="text-xs text-green-400">{t('contacts.added')} ✓</span>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            await contactsApi.add(user.id);
                            await fetchContacts();
                            setSearchResults(prev => prev.filter(u => u.id !== user.id));
                            setAddPhone('+');
                            setShowAddDialog(false);
                            showToast(t('contacts.addedToast'));
                          } catch {}
                        }}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors"
                      >
                        {t('contacts.add')}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Invite when no account */}
              {noAccountFound && searchResults.length === 0 && !searchingPhone && (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm text-gray-400 mb-3">{t('contacts.notFound')}</p>
                  <button
                    onClick={() => handleInvite(addPhone)}
                    className="w-full py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {t('contacts.invite')}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-dark-600">
              <button
                onClick={() => setShowAddDialog(false)}
                className="w-full py-2.5 rounded-xl border border-dark-500 text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t('newChat.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {contactMenu && (
        <MessageContextMenu
          x={contactMenu.x}
          y={contactMenu.y}
          items={[
            { label: t('contacts.edit'), icon: 'edit', onClick: () => handleEditContact(contactMenu.contact) },
            { label: contactMenu.contact.isFavorite ? t('contacts.unfavorite') : t('contacts.favorite'), icon: 'star', onClick: () => handleToggleFavorite(contactMenu.contact) },
            { label: t('contacts.block'), icon: 'block', onClick: () => handleBlockContact(contactMenu.contact) },
            { label: t('contacts.delete'), icon: 'delete', onClick: () => handleDeleteContact(contactMenu.contact), danger: true },
          ]}
          onClose={() => setContactMenu(null)}
        />
      )}

      {editingContact && (
        <ContactCard contact={editingContact} onClose={() => setEditingContact(null)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
