import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({ isAuthenticated: true });
  },

  logout: async () => {
    try {
      // 1. Tell server to invalidate session cookies
      const { apiClient } = await import('../services/api/apiClient');
      await apiClient.post('/auth/logout');
    } catch (_err) {
      // Ignore network/server errors during logout
    }

    // 2. Clear all authentication tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('client_dashboard_last_seen');

    // 3. Purge user-specific drafts and studio autosaves
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('buoyant_') || key.startsWith('studio_') || key.startsWith('draft_'))) {
          if (key !== 'buoyant-theme-storage') {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_storageErr) {
      // Storage access safeguard
    }

    // 4. Clear all session storage completely
    sessionStorage.clear();

    // 5. Clear document cookies if set client-side
    if (typeof document !== 'undefined') {
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    // 6. Reset in-memory state
    set({ user: null, isAuthenticated: false, isLoading: false });

    // 7. Full window redirect to /login to ensure all in-memory React states are completely cleared
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  },
}));
