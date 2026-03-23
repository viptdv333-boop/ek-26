import { api } from './client';

// Auth
export const authApi = {
  requestCode: (phone: string) => api.post<{ message: string }>('/auth/request-code', { phone }),
  verifyCode: (phone: string, code: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: any; isNewUser: boolean }>('/auth/verify-code', { phone, code }),
  telegramLogin: (data: Record<string, string | number>) =>
    api.post<{ accessToken: string; refreshToken: string; user: any; isNewUser: boolean }>('/auth/telegram', data),
  linkPhoneRequest: (phone: string) => api.post<{ message: string }>('/auth/link-phone/request', { phone }),
  linkPhoneVerify: (phone: string, code: string) =>
    api.post<{ success: boolean; user: any }>('/auth/link-phone/verify', { phone, code }),
};

// Users
export const usersApi = {
  getProfile: () => api.get<any>('/users/me'),
  updateProfile: (data: { displayName?: string }) => api.patch<any>('/users/me', data),
  lookupByPhone: (phone: string) => api.get<any>(`/users/lookup/${encodeURIComponent(phone)}`),
  search: (query: string) => api.get<any[]>(`/users/search?q=${encodeURIComponent(query)}`),
};

// Conversations
export const conversationsApi = {
  list: (cursor?: string) => api.get<{ conversations: any[]; nextCursor: string | null }>(`/conversations${cursor ? `?cursor=${cursor}` : ''}`),
  create: (participantId: string) => api.post<any>('/conversations/direct', { participantId }),
  createGroup: (name: string, participantIds: string[]) => api.post<any>('/conversations/group', { name, participantIds }),
  getDetails: (id: string) => api.get<any>(`/conversations/${id}`),
};

// Messages
export const messagesApi = {
  list: (conversationId: string, cursor?: string) =>
    api.get<{ messages: any[]; nextCursor: string | null }>(`/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  send: (conversationId: string, data: { type: string; text?: string }) =>
    api.post<any>(`/conversations/${conversationId}/messages`, data),
};

// Keys (E2EE)
export const keysApi = {
  uploadBundle: (bundle: any) => api.post<{ success: boolean }>('/keys/bundle', bundle),
  fetchBundle: (userId: string) => api.get<any>(`/keys/bundle/${userId}`),
  replenish: (oneTimePreKeys: any[]) =>
    api.post<{ success: boolean; added: number }>('/keys/replenish', { oneTimePreKeys }),
  getCount: () => api.get<{ oneTimePreKeyCount: number; hasSignedPreKey: boolean }>('/keys/count'),
};

// Message actions
export const messageActionsApi = {
  edit: (msgId: string, text: string) => api.patch<any>(`/messages/${msgId}/edit`, { text }),
  delete: (msgId: string) => api.delete<any>(`/messages/${msgId}`),
  pin: (convId: string, messageId: string) => api.post<any>(`/conversations/${convId}/pin`, { messageId }),
  unpin: (convId: string, messageId: string) => api.delete<any>(`/conversations/${convId}/pin/${messageId}`),
  getPins: (convId: string) => api.get<any>(`/conversations/${convId}/pin`),
};

// Contacts
export const contactsApi = {
  list: () => api.get<any[]>('/contacts'),
  add: (contactUserId: string, nickname?: string) =>
    api.post<any>('/contacts', { contactUserId, nickname }),
  remove: (contactUserId: string) => api.delete<{ success: boolean }>(`/contacts/${contactUserId}`),
};
