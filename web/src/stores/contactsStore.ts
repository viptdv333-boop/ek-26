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
  createdAt: string;
}

interface ContactsState {
  contacts: Contact[];
  loading: boolean;
  fetchContacts: () => Promise<void>;
  addContact: (userId: string, nickname?: string) => Promise<Contact>;
  removeContact: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  loading: false,

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

  reset: () => set({ contacts: [], loading: false }),
}));
