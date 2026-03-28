import { create } from 'zustand';
import { contactsApi } from '../services/api/endpoints';

export interface Contact {
  id: string;
  userId: string;
  displayName: string;
  originalName: string;
  nickname: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: string;
  lastSeen: string | null;
  telegramUsername?: string | null;
  note?: string | null;
  isFavorite?: boolean;
  createdAt: string;
}

export interface SyncedContact {
  id: string;
  phone: string;
  name: string;
  avatarUrl?: string | null;
  source: 'google' | 'apple' | 'vcf';
  registeredUserId?: string | null;
  isRegistered: boolean;
}

interface ContactsState {
  contacts: Contact[];
  syncedContacts: SyncedContact[];
  loading: boolean;
  fetchContacts: () => Promise<void>;
  fetchSyncedContacts: () => Promise<void>;
  addContact: (userId: string, nickname?: string) => Promise<Contact>;
  removeContact: (userId: string) => Promise<void>;
  updateContact: (userId: string, data: { nickname?: string | null; note?: string | null; customAvatar?: string | null; isFavorite?: boolean }) => Promise<void>;
  reset: () => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  syncedContacts: [],
  loading: false,

  fetchSyncedContacts: async () => {
    try {
      const synced = await contactsApi.fetchSynced();
      set({ syncedContacts: Array.isArray(synced) ? synced : [] });
    } catch {
      // ignore
    }
  },

  fetchContacts: async () => {
    set({ loading: true });
    try {
      const contacts = await contactsApi.list();
      set({ contacts: Array.isArray(contacts) ? contacts : [] });
    } catch {
      // ignore
    } finally {
      set({ loading: false });
    }
  },

  addContact: async (userId, nickname) => {
    const contact = await contactsApi.add(userId, nickname);
    set((state) => ({
      contacts: [...state.contacts, contact],
    }));
    return contact;
  },

  removeContact: async (userId) => {
    await contactsApi.remove(userId);
    set((state) => ({
      contacts: state.contacts.filter((c) => c.userId !== userId),
    }));
  },

  updateContact: async (userId, data) => {
    await contactsApi.update(userId, data);
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.userId === userId
          ? {
              ...c,
              nickname: data.nickname !== undefined ? data.nickname : c.nickname,
              displayName: data.nickname || c.originalName,
              note: data.note !== undefined ? data.note : c.note,
              avatarUrl: data.customAvatar !== undefined ? data.customAvatar : c.avatarUrl,
              isFavorite: data.isFavorite !== undefined ? data.isFavorite : c.isFavorite,
            }
          : c
      ),
    }));
  },

  reset: () => set({ contacts: [], syncedContacts: [], loading: false }),
}));
