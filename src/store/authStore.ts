import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'user';

type User = {
  id: string;
  email: string;
  username: string;
  role: Role;
  balance: number;
  createdAt: string;
};

type LoginResult = {
  success: boolean;
  isAdmin?: boolean;
  error?: string;
};

type RegisterResult = {
  success: boolean;
  error?: string;
};

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string, username: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateBalance: (amount: number) => Promise<void>;
  setUser: (user: User | null) => void;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
};

const ADMIN_EMAIL = 'yousefch1978@gmail.com';

function toAppUser(supabaseUser: any): User {
  const email = supabaseUser?.email || '';
  const username =
    supabaseUser?.user_metadata?.username ||
    email.split('@')[0] ||
    'Player';

  return {
    id: supabaseUser.id,
    email,
    username,
    role: email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
    balance: Number(supabaseUser?.user_metadata?.balance ?? 0),
    createdAt: supabaseUser?.created_at || new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return { success: false, error: error?.message || 'Login failed' };
      }

      const user = toAppUser(data.user);
      set({ user, isAuthenticated: true });

      return { success: true, isAdmin: user.role === 'admin' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  },

  async register(email, password, username) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            balance: 0,
          },
        },
      });

      if (error || !data.user) {
        return { success: false, error: error?.message || 'Registration failed' };
      }

      const user = toAppUser(data.user);
      set({
        user,
        isAuthenticated: !!data.session || !!data.user,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch {}

    set({ user: null, isAuthenticated: false });
  },

  async updateBalance(amount) {
    const currentUser = get().user;
    if (!currentUser) return;

    const newBalance = Number((currentUser.balance + amount).toFixed(2));

    set({
      user: {
        ...currentUser,
        balance: newBalance,
      },
      isAuthenticated: true,
    });

    try {
      await supabase.auth.updateUser({
        data: {
          username: currentUser.username,
          balance: newBalance,
        },
      });
    } catch {}
  },

  setUser(user) {
    set({ user, isAuthenticated: !!user });
  },

  isAdmin() {
    return get().user?.role === 'admin';
  },

  async refreshUser() {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      set({
        user: toAppUser(data.user),
        isAuthenticated: true,
      });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));

export const initializeAuth = async () => {
  await useAuthStore.getState().refreshUser();
};
