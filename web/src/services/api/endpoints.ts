import { api } from './client';

// Auth
export const authApi = {
  // Get verification method (call vs sms)
  getVerifyMethod: () => api.get<{ method: 'call' | 'sms' }>('/auth/verify-method'),
  // Legacy phone+code flow
  requestCode: (phone: string) => api.post<{ message: string }>('/auth/request-code', { phone }),
  verifyCode: (phone: string, code: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: any; isNewUser: boolean; needsPassword?: boolean }>('/auth/verify-code', { phone, code }),
  telegramLogin: (data: Record<string, string | number>) =>
    api.post<{ accessToken: string; refreshToken: string; user: any; isNewUser: boolean }>('/auth/telegram', data),
  yandexLogin: (code: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: any; isNewUser: boolean }>('/auth/yandex', { code }),
  linkPhoneRequest: (phone: string) => api.post<{ message: string }>('/auth/link-phone/request', { phone }),
  linkPhoneVerify: (phone: string, code: string) =>
    api.post<{ success: boolean; user: any }>('/auth/link-phone/verify', { phone, code }),

  // New auth flow
  register: (data: { phone: string }) =>
    api.post<{ success: boolean }>('/auth/register', data),
  registerVerifyPhone: (phone: string, code: string) =>
    api.post<{ success: boolean; verified: boolean }>('/auth/register/verify-phone', { phone, code }),
  registerSetPassword: (phone: string, password: string, confirmPassword: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/register/set-password', { phone, password, confirmPassword }),
  login: (phone: string, password: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { phone, password }),
  setPassword: (password: string, confirmPassword: string) =>
    api.post<{ success: boolean }>('/auth/set-password', { password, confirmPassword }),
  linkEmail: (email: string) =>
    api.post<{ success: boolean }>('/auth/link-email', { email }),
};

// Users
export const usersApi = {
  getProfile: () => api.get<any>('/users/me'),
  updateProfile: (data: { displayName?: string }) => api.patch<any>('/users/me', data),
  lookupByPhone: (phone: string) => api.get<any>(`/users/lookup/${encodeURIComponent(phone)}`),
  search: (query: string) => api.get<any[]>(`/users/search?q=${encodeURIComponent(query)}`),
  lookupByPhones: (phones: string[]) => api.post<any[]>('/users/lookup', { phones }),
  registerPushToken: (token: string, platform: 'fcm' | 'apns') => api.post<any>('/users/me/push-token', { token, platform }),
};

// Conversations
export const conversationsApi = {
  list: (cursor?: string) => api.get<{ conversations: any[]; nextCursor: string | null }>(`/conversations${cursor ? `?cursor=${cursor}` : ''}`),
  create: (participantId: string) => api.post<any>('/conversations/direct', { participantId }),
  createGroup: (name: string, participantIds: string[]) => api.post<any>('/conversations/group', { name, participantIds }),
  getDetails: (id: string) => api.get<any>(`/conversations/${id}`),
  delete: (id: string) => api.delete<any>(`/conversations/${id}`),
  updateGroup: (id: string, data: { name?: string; avatarUrl?: string }) => api.patch<any>(`/conversations/${id}`, data),
  addMembers: (id: string, userIds: string[]) => api.post<any>(`/conversations/${id}/members`, { userIds }),
  removeMember: (id: string, userId: string) => api.delete<any>(`/conversations/${id}/members/${userId}`),
  updateAdmin: (id: string, userId: string, action: 'add' | 'remove') =>
    api.patch<{ success: boolean }>(`/conversations/${id}/admins`, { userId, action }),
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
  react: (msgId: string, emoji: string) => api.post<any>(`/messages/${msgId}/reactions`, { emoji }),
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
  update: (contactUserId: string, data: { nickname?: string | null; note?: string | null; customAvatar?: string | null; isFavorite?: boolean }) =>
    api.patch<any>(`/contacts/${contactUserId}`, data),
  invite: (phone: string) => api.post<{ success: boolean }>('/contacts/invite', { phone }),
  batchAdd: (userIds: string[]) => api.post<{ added: number; duplicates: number }>('/contacts/batch', { userIds }),
  syncSave: (contacts: Array<{phone: string, name: string, avatarUrl?: string, registeredUserId?: string}>, source: 'google' | 'apple' | 'vcf') =>
    api.post<{ saved: number }>('/contacts/sync-save', { contacts, source }),
  fetchSynced: () => api.get<any[]>('/contacts/synced'),
  deleteAll: () => api.delete<any>('/contacts/all'),
};

// Translate
export const translateApi = {
  translate: (text: string, to: string, from?: string) =>
    api.post<{ translated: string; detectedLang?: string }>('/translate', { text, from, to }),
};

// Search
export const searchApi = {
  messages: (q: string) => api.get<{ results: any[] }>(`/messages/search?q=${encodeURIComponent(q)}`),
};

// Chat actions
export const chatActionsApi = {
  mute: (convId: string) => api.patch<{ muted: boolean }>(`/conversations/${convId}/mute`, {}),
  archive: (convId: string) => api.patch<{ archived: boolean }>(`/conversations/${convId}/archive`, {}),
  block: (userId: string) => api.post<any>(`/users/block/${userId}`, {}),
  unblock: (userId: string) => api.delete<any>(`/users/block/${userId}`),
  deleteAccount: () => api.delete<any>('/users/me'),
};
