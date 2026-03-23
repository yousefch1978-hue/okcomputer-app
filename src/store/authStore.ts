import { create } from 'zustand';
import type { User, AuthState } from '@/types';
import { api, setSessionToken } from '@/lib/api';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean; error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateBalance: (amount: number) => Promise<void>;
  setUser: (user: User | null) => void;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  async login(email, password) {
    try {
      const { user, token } = await api<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      setSessionToken(token);
      set({ user, isAuthenticated: true });
      return { success: true, isAdmin: user.role === 'admin' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  },

  async register(email, password, username) {
    try {
      const { user, token } = await api<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST', body: JSON.stringify({ email, password, username }),
      });
      setSessionToken(token);
      set({ user, isAuthenticated: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  },

  async logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    setSessionToken('');
    set({ user: null, isAuthenticated: false });
  },

  async updateBalance(amount) {
    const { user } = get();
    if (!user) return;
    const { user: updated } = await api<{ user: User }>('/api/user/balance', { method: 'POST', body: JSON.stringify({ amount }) });
    set({ user: updated, isAuthenticated: true });
  },

  setUser(user) {
    set({ user, isAuthenticated: !!user });
  },

  isAdmin() {
    return get().user?.role === 'admin';
  },

  async refreshUser() {
    try {
      const { user } = await api<{ user: User }>('/api/auth/me');
      set({ user, isAuthenticated: true });
    } catch {
      setSessionToken('');
      set({ user: null, isAuthenticated: false });
    }
  },
}));

export const initializeAuth = async () => {
  await useAuthStore.getState().refreshUser();
};
