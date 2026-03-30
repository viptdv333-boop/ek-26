import { useEffect, useState, useRef } from 'react';
import { useContactsStore, Contact } from '../stores/contactsStore';
import { useChatStore } from '../stores/chatStore';
import { conversationsApi, usersApi, contactsApi, chatActionsApi } from '../services/api/endpoints';
import { MessageContextMenu } from './MessageContextMenu';
import { ContactCard } from './ContactCard';
import { useTranslation } from '../i18n';

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
  const syncedContacts = useContactsStore((s) => s.syncedContacts);
  const loading = useContactsStore((s) => s.loading);
  const fetchContacts = useContactsStore((s) => s.fetchContacts);
  const fetchSyncedContacts = useContactsStore((s) => s.fetchSyncedContacts);
  const removeContact = useContactsStore((s) => s.removeContact);
  const updateContact = useContactsStore((s) => s.updateContact);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const addConversation = useChatStore((s) => s.addConversation);
  const [contactMenu, setContactMenu] = useState<{ x: number; y: number; contact: Contact } | null>(null);
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

  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchContacts();
    fetchSyncedContacts();
  }, [fetchContacts, fetchSyncedContacts]);

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

  // Build map of synced names/avatars by phone for priority override
  const syncedByPhone = new Map(syncedContacts.map(sc => [sc.phone, sc]));
  const syncedByUserId = new Map(
    syncedContacts.filter(sc => sc.registeredUserId).map(sc => [sc.registeredUserId!, sc])
  );

  // Override display names with synced (Google/Apple) names
  const sortedContacts = [...contacts].map(c => {
    const synced = syncedByUserId.get(c.userId) || (c.phone ? syncedByPhone.get(c.phone) : undefined);
    if (synced && synced.name) {
      return { ...c, displayName: synced.name, avatarUrl: synced.avatarUrl || c.avatarUrl };
    }
    return c;
  }).sort((a, b) => {
    const aFav = a.isFavorite ? 1 : 0;
    const bFav = b.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return (a.displayName || '').localeCompare(b.displayName || '', 'ru');
  });

  // Synced contacts: split into registered (not already in contacts) and unregistered
  const contactUserIds = new Set(contacts.map(c => c.userId));
  const registeredSynced = syncedContacts
    .filter(sc => sc.isRegistered && sc.registeredUserId && !contactUserIds.has(sc.registeredUserId))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const unregisteredSynced = syncedContacts
    .filter(sc => !sc.isRegistered)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  // Filter by search query
  const q = searchQuery.toLowerCase().trim();
  const filteredContacts = q
    ? sortedContacts.filter(c => c.displayName?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q))
    : sortedContacts;
  const filteredRegisteredSynced = q
    ? registeredSynced.filter(sc => sc.name?.toLowerCase().includes(q) || sc.phone?.toLowerCase().includes(q))
    : registeredSynced;
  const filteredUnregisteredSynced = q
    ? unregisteredSynced.filter(sc => sc.name?.toLowerCase().includes(q) || sc.phone?.toLowerCase().includes(q))
    : unregisteredSynced;

  const [contactsTab, setContactsTab] = useState<'all' | 'import'>('all');

  const favorites = filteredContacts.filter(c => c.isFavorite);
  const nonFavorites = filteredContacts.filter(c => !c.isFavorite);

  return (
    <>
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('contacts.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2 bg-[var(--color-dark-700)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-accent transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-lg">&times;</button>
          )}
        </div>
      </div>

      {/* Add Contact button (black, top) */}
      <div className="px-3 pb-2">
        <button
          onClick={() => { setShowAddDialog(true); setAddPhone('+'); setAddError(''); setSearchResults([]); setNoAccountFound(false); }}
          className="w-full py-2.5 bg-[var(--color-text-primary)] text-[var(--color-dark-800)] rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:opacity-90"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          {t('contacts.addContact')}
        </button>
      </div>

      {/* Contacts list */}
      <div className="flex-1 overflow-y-auto px-2" style={{ minHeight: 0 }}>
        {loading && <p className="text-center text-[var(--color-text-muted)] text-sm py-4">{t('contacts.loading')}</p>}

        {/* FAVORITES section */}
        {favorites.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-3 py-2">{t('contacts.favorites')}</p>
            {favorites.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-dark-600)] rounded-xl transition-colors group">
                <div className="relative cursor-pointer" onClick={() => handleOpenChat(contact)}>
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-sm font-medium">{contact.displayName[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  {isOnline(contact.userId) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-dark-800)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenChat(contact)}>
                  <p className="text-sm text-[var(--color-text-primary)] truncate">{contact.displayName}</p>
                  {contact.phone && <p className="text-xs text-[var(--color-text-muted)] truncate">{contact.phone}</p>}
                </div>
                {/* Star + menu */}
                <button onClick={() => handleToggleFavorite(contact)} className="text-yellow-400 hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </button>
                <div onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setContactMenu({ x: rect.left, y: rect.bottom, contact }); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-dark-500)] text-[var(--color-text-muted)] cursor-pointer">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ALL CONTACTS section */}
        {(nonFavorites.length > 0 || filteredRegisteredSynced.length > 0) && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-3 py-2 mt-1">{t('contacts.allContacts')}</p>
            {nonFavorites.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-dark-600)] rounded-xl transition-colors group">
                <div className="relative cursor-pointer" onClick={() => handleOpenChat(contact)}>
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-sm font-medium">{contact.displayName[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  {isOnline(contact.userId) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-dark-800)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenChat(contact)}>
                  <p className="text-sm text-[var(--color-text-primary)] truncate">{contact.displayName}</p>
                  {contact.phone && <p className="text-xs text-[var(--color-text-muted)] truncate">{contact.phone}</p>}
                </div>
                {/* Star (empty) + menu */}
                <button onClick={() => handleToggleFavorite(contact)} className="text-[var(--color-text-muted)] hover:text-yellow-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                </button>
                <div onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setContactMenu({ x: rect.left, y: rect.bottom, contact }); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-dark-500)] text-[var(--color-text-muted)] cursor-pointer">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                </div>
              </div>
            ))}
            {filteredRegisteredSynced.map((sc) => (
              <div key={`synced-${sc.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-dark-600)] rounded-xl transition-colors">
                {sc.avatarUrl ? (
                  <img src={sc.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-sm font-medium">{sc.name?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] truncate">{sc.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{sc.phone}</p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Not registered */}
        {filteredUnregisteredSynced.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-3 py-2 mt-1">{t('contacts.notRegistered')} ({filteredUnregisteredSynced.length})</p>
            {filteredUnregisteredSynced.map((sc) => (
              <div key={`unreg-${sc.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-dark-600)] rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-full bg-[var(--color-dark-500)] flex items-center justify-center">
                  <span className="text-[var(--color-text-secondary)] text-sm">{sc.name?.[0]?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] truncate">{sc.name || sc.phone}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{sc.phone}</p>
                </div>
                <button onClick={() => handleInvite(sc.phone)} className="px-2.5 py-1 border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs rounded-lg hover:bg-[var(--color-dark-600)] transition-colors">
                  {t('contacts.invite')}
                </button>
              </div>
            ))}
          </>
        )}

        {!loading && filteredContacts.length === 0 && filteredRegisteredSynced.length === 0 && filteredUnregisteredSynced.length === 0 && (
          <p className="text-center text-[var(--color-text-muted)] text-sm py-8">
            {q ? t('contacts.nothingFound') : t('contacts.noContacts')}
          </p>
        )}
      </div>

      {/* Add Contact Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddDialog(false)}>
          <div
            className="w-full max-w-sm bg-[var(--color-dark-700)] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('contacts.addContact')}</h2>
              <div className="flex gap-2">
                <input
                  value={addPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddByPhone()}
                  placeholder={t('contacts.enterNumber')}
                  className="flex-1 px-4 py-2.5 bg-[var(--color-dark-800)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-accent transition-colors"
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
              {searchingPhone && <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('contacts.searching')}</p>}
            </div>

            <div className="flex-1 overflow-y-auto py-1 max-h-64">
              {/* Search results */}
              {searchResults.map((user) => {
                const alreadyAdded = contacts.some(c => c.userId === user.id);
                return (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-dark-600)] transition-colors">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-accent text-sm font-medium">{user.displayName[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)] truncate">{user.displayName}</p>
                      {user.phone && <p className="text-xs text-[var(--color-text-muted)] truncate">{user.phone}</p>}
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
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">{t('contacts.notFound')}</p>
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

            <div className="p-4 border-t border-[var(--color-border)]">
              <button
                onClick={() => setShowAddDialog(false)}
                className="w-full py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm"
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
