import { create } from 'zustand';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  text?: string;
  status: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  groupMeta: { name: string; avatarUrl: string | null; admins: string[]; createdBy: string } | null;
  lastMessage: { text: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  typingUsers: Record<string, string[]>;

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setActiveConversation: (id: string | null) => void;
  setTyping: (conversationId: string, userIds: string[]) => void;
  updateLastMessage: (conversationId: string, message: { text: string; senderId: string; createdAt: string }) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations.filter((c) => c.id !== conversation.id)],
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: { ...state.messages, [conversationId]: [...existing, message] },
      };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setTyping: (conversationId, userIds) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: userIds },
    })),

  updateLastMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c
      ),
    })),
}));
