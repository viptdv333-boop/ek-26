import { apiCall } from './client';

// Auth
export const authApi = {
  requestCode: (phone: string) =>
    apiCall('/api/auth/request-code', { method: 'POST', body: { phone }, auth: false }),

  verifyCode: (phone: string, code: string) =>
    apiCall<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; phone: string; displayName: string; avatarUrl: string | null; isNewUser: boolean };
    }>('/api/auth/verify-code', { method: 'POST', body: { phone, code }, auth: false }),

  logout: () =>
    apiCall('/api/auth/logout', { method: 'POST' }),
};

// Users
export const usersApi = {
  getMe: () =>
    apiCall<{
      id: string; phone: string; displayName: string; avatarUrl: string | null;
      status: string; lastSeen: string; createdAt: string;
    }>('/api/users/me'),

  updateProfile: (data: { displayName?: string; avatarUrl?: string | null; status?: string }) =>
    apiCall('/api/users/me', { method: 'PATCH', body: data }),

  getProfile: (userId: string) =>
    apiCall<{
      id: string; displayName: string; avatarUrl: string | null; status: string; lastSeen: string;
    }>(`/api/users/${userId}/profile`),

  lookup: (phones: string[]) =>
    apiCall<Array<{ id: string; phone: string; displayName: string; avatarUrl: string | null }>>
    ('/api/users/lookup', { method: 'POST', body: { phones } }),

  registerPushToken: (token: string, platform: 'fcm' | 'apns') =>
    apiCall('/api/users/me/push-token', { method: 'POST', body: { token, platform } }),
};

// Conversations
export const conversationsApi = {
  list: (cursor?: string) =>
    apiCall<Array<{
      id: string; type: string;
      participants: Array<{ id: string; displayName: string; avatarUrl: string | null; phone: string }>;
      groupMeta: { name: string; avatarUrl: string | null; admins: string[]; createdBy: string } | null;
      lastMessage: { text: string; senderName: string; timestamp: string } | null;
      createdAt: string; updatedAt: string;
    }>>(`/api/conversations${cursor ? `?cursor=${cursor}` : ''}`),

  createDirect: (participantId: string) =>
    apiCall<{ id: string; existing: boolean }>('/api/conversations/direct', { method: 'POST', body: { participantId } }),

  createGroup: (name: string, participantIds: string[]) =>
    apiCall<{ id: string }>('/api/conversations/group', { method: 'POST', body: { name, participantIds } }),

  getDetails: (id: string) =>
    apiCall(`/api/conversations/${id}`),
};

// Messages
export const messagesApi = {
  list: (conversationId: string, cursor?: string) =>
    apiCall<Array<{
      id: string; conversationId: string;
      sender: { id: string; displayName: string; avatarUrl: string | null };
      type: string; text: string | null; attachments: any[];
      replyToId: string | null; status: string; deliveredVia: string; createdAt: string;
    }>>(`/api/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`),

  send: (conversationId: string, text: string, replyToId?: string) =>
    apiCall(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { type: 'text', text, replyToId },
    }),
};
