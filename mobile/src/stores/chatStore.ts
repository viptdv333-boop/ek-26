import { create } from 'zustand';

interface Participant {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string;
}

interface ConversationItem {
  id: string;
  type: 'direct' | 'group';
  participants: Participant[];
  groupMeta: {
    name: string;
    avatarUrl: string | null;
    admins: string[];
  } | null;
  lastMessage: {
    text: string;
    senderName: string;
    timestamp: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  conversationId: string;
  sender: { id: string; displayName: string };
  type: string;
  text: string | null;
  replyToId: string | null;
  status: string;
  createdAt: string;
}

interface ChatState {
  conversations: ConversationItem[];
  messages: Record<string, MessageItem[]>; // conversationId -> messages
  activeConversationId: string | null;
  typingUsers: Record<string, string[]>; // conversationId -> userIds

  setConversations: (conversations: ConversationItem[]) => void;
  addConversation: (conversation: ConversationItem) => void;
  updateLastMessage: (conversationId: string, message: { text: string; senderName: string; timestamp: string }) => void;

  setMessages: (conversationId: string, messages: MessageItem[]) => void;
  addMessage: (conversationId: string, message: MessageItem) => void;
  prependMessages: (conversationId: string, messages: MessageItem[]) => void;

  setActiveConversation: (id: string | null) => void;

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
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

  updateLastMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations
        .map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: message, updatedAt: message.timestamp }
            : c
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),

  prependMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...messages, ...(state.messages[conversationId] || [])],
      },
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...state.typingUsers, [conversationId]: updated } };
    }),

  incrementUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      ),
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),
}));
