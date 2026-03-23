import { create } from 'zustand';

export interface Attachment {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface ReplyTo {
  id: string;
  text: string | null;
  senderName: string;
}

export interface ForwardedFrom {
  originalSenderName: string;
  originalText: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  type: string;
  text?: string | null;
  attachments?: Attachment[];
  replyToId?: string | null;
  replyTo?: ReplyTo | null;
  forwardedFrom?: ForwardedFrom | null;
  encrypted?: boolean;
  editedAt?: string;
  status: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: Array<{ id: string; displayName: string; avatarUrl?: string | null }> | string[];
  groupMeta: { name: string; avatarUrl: string | null; admins: string[]; createdBy: string } | null;
  lastMessage: { text: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  pinnedMessages?: Array<{ id: string; text: string | null; senderName: string }>;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  typingUsers: Record<string, string[]>;
  onlineUsers: Set<string>;
  replyingTo: { conversationId: string; messageId: string; text: string; senderName: string } | null;

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setActiveConversation: (id: string | null) => void;
  setTyping: (conversationId: string, userIds: string[]) => void;
  updateLastMessage: (conversationId: string, message: { text: string; senderId: string; createdAt: string }) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  setReplyingTo: (data: { conversationId: string; messageId: string; text: string; senderName: string } | null) => void;
  editMessage: (messageId: string, text: string, editedAt: string) => void;
  deleteMessage: (messageId: string) => void;
  setPinnedMessages: (conversationId: string, pinned: Array<{ id: string; text: string | null; senderName: string }>) => void;
  addPinnedMessage: (conversationId: string, pinned: { id: string; text: string | null; senderName: string }) => void;
  removePinnedMessage: (conversationId: string, messageId: string) => void;
  editingMessage: { messageId: string; text: string } | null;
  setEditingMessage: (data: { messageId: string; text: string } | null) => void;
  sortConversations: () => void;
  setUserOnline: (userId: string, online: boolean) => void;
  isUserOnline: (userId: string) => boolean;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: sessionStorage.getItem('ek26_activeConv'),
  typingUsers: {},
  onlineUsers: new Set(),
  replyingTo: null,
  editingMessage: null,

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

  setActiveConversation: (id) => {
    if (id) {
      sessionStorage.setItem('ek26_activeConv', id);
      // Clear unread count when opening a conversation
      set((state) => ({
        activeConversationId: id,
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } else {
      sessionStorage.removeItem('ek26_activeConv');
      set({ activeConversationId: id });
    }
  },

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

  updateMessageStatus: (messageId, status) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const convId of Object.keys(newMessages)) {
        newMessages[convId] = newMessages[convId].map((m) =>
          m.id === messageId ? { ...m, status } : m
        );
      }
      return { messages: newMessages };
    }),

  incrementUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
      ),
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  setReplyingTo: (data) => set({ replyingTo: data }),

  setEditingMessage: (data) => set({ editingMessage: data }),

  editMessage: (messageId, text, editedAt) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const convId of Object.keys(newMessages)) {
        newMessages[convId] = newMessages[convId].map((m) =>
          m.id === messageId ? { ...m, text, editedAt } : m
        );
      }
      return { messages: newMessages };
    }),

  deleteMessage: (messageId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const convId of Object.keys(newMessages)) {
        newMessages[convId] = newMessages[convId].filter((m) => m.id !== messageId);
      }
      return { messages: newMessages };
    }),

  setPinnedMessages: (conversationId, pinned) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, pinnedMessages: pinned } : c
      ),
    })),

  addPinnedMessage: (conversationId, pinned) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, pinnedMessages: [pinned, ...(c.pinnedMessages || [])] }
          : c
      ),
    })),

  removePinnedMessage: (conversationId, messageId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, pinnedMessages: (c.pinnedMessages || []).filter((p) => p.id !== messageId) }
          : c
      ),
    })),

  sortConversations: () =>
    set((state) => ({
      conversations: [...state.conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    })),

  setUserOnline: (userId, online) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      if (online) next.add(userId); else next.delete(userId);
      return { onlineUsers: next };
    }),

  isUserOnline: (userId) => get().onlineUsers.has(userId),

  reset: () => {
    sessionStorage.removeItem('ek26_activeConv');
    set({
      conversations: [],
      messages: {},
      activeConversationId: null,
      typingUsers: {},
      onlineUsers: new Set(),
      replyingTo: null,
    });
  },
}));
