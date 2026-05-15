'use client';

import { create } from 'zustand';
import api from './api';
import type { User, Business } from './types';

interface AuthState {
  user: User | null;
  token: string | null;
  business: Business | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  business: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    // After interceptor: response.data = { user, token }
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data as { token: string; user: User };
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    set({ user, token, business: null, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      set({ user: null, token: null, business: null, isAuthenticated: false });
    }
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('auth_token');
    if (token) {
      set({ token, isAuthenticated: true });
      // After interceptor: res.data = user object (with .business loaded)
      api.get('/auth/me').then((res) => {
        const userWithBusiness = res.data as User & { business?: Business };
        set({ user: userWithBusiness, business: userWithBusiness.business ?? null });
      }).catch(() => {
        localStorage.removeItem('auth_token');
        set({ token: null, isAuthenticated: false });
      });
    }
  },
}));
