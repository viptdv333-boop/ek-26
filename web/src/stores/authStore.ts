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
  rememberMe: boolean;
  login: (token: string, refreshToken: string, user: User, remember?: boolean) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (token: string, refreshToken: string) => void;
}

// Helper: get from whichever storage has it
function getStored(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function getStorage(): Storage {
  // If token is in localStorage, user chose "remember me"
  return localStorage.getItem('ek26_token') ? localStorage : sessionStorage;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStored('ek26_token'),
  refreshToken: getStored('ek26_refresh'),
  user: JSON.parse(getStored('ek26_user') || 'null'),
  isAuthenticated: !!getStored('ek26_token'),
  rememberMe: !!localStorage.getItem('ek26_token'),

  login: (token, refreshToken, user, remember = true) => {
    const storage = remember ? localStorage : sessionStorage;
    // Clear both first
    localStorage.removeItem('ek26_token');
    localStorage.removeItem('ek26_refresh');
    localStorage.removeItem('ek26_user');
    sessionStorage.removeItem('ek26_token');
    sessionStorage.removeItem('ek26_refresh');
    sessionStorage.removeItem('ek26_user');
    // Save to chosen storage
    storage.setItem('ek26_token', token);
    storage.setItem('ek26_refresh', refreshToken);
    storage.setItem('ek26_user', JSON.stringify(user));
    set({ token, refreshToken, user, isAuthenticated: true, rememberMe: remember });
  },

  logout: () => {
    localStorage.removeItem('ek26_token');
    localStorage.removeItem('ek26_refresh');
    localStorage.removeItem('ek26_user');
    sessionStorage.removeItem('ek26_token');
    sessionStorage.removeItem('ek26_refresh');
    sessionStorage.removeItem('ek26_user');
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  updateUser: (partial) =>
    set((state) => {
      const user = state.user ? { ...state.user, ...partial } : null;
      if (user) {
        const storage = getStorage();
        storage.setItem('ek26_user', JSON.stringify(user));
      }
      return { user };
    }),

  setTokens: (token, refreshToken) => {
    const storage = getStorage();
    storage.setItem('ek26_token', token);
    storage.setItem('ek26_refresh', refreshToken);
    set({ token, refreshToken });
  },
}));
