import { create } from 'zustand';

interface User {
  id: string;
  phone: string;
  displayName: string;
  avatarUrl: string | null;
  email?: string | null;
  status?: string;
  isAdmin?: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (token: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('ek26_token'),
  refreshToken: localStorage.getItem('ek26_refresh'),
  user: JSON.parse(localStorage.getItem('ek26_user') || 'null'),
  isAuthenticated: !!localStorage.getItem('ek26_token'),

  login: (token, refreshToken, user) => {
    localStorage.setItem('ek26_token', token);
    localStorage.setItem('ek26_refresh', refreshToken);
    localStorage.setItem('ek26_user', JSON.stringify(user));
    set({ token, refreshToken, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('ek26_token');
    localStorage.removeItem('ek26_refresh');
    localStorage.removeItem('ek26_user');
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  updateUser: (partial) =>
    set((state) => {
      const user = state.user ? { ...state.user, ...partial } : null;
      if (user) localStorage.setItem('ek26_user', JSON.stringify(user));
      return { user };
    }),

  setTokens: (token, refreshToken) => {
    localStorage.setItem('ek26_token', token);
    localStorage.setItem('ek26_refresh', refreshToken);
    set({ token, refreshToken });
  },
}));
