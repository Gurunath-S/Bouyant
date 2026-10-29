import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore, applyTheme } from '../stores/themeStore';
import { authService } from '../services/auth/authService';
import { GlobalDialog } from '../components/ui/GlobalDialog';

export const App: React.FC = () => {
  const { setUser, isAuthenticated } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated) {
      authService
        .getMe()
        .then((user) => setUser(user))
        .catch(() => {
          // Token expired or invalid - clear user state
          useAuthStore.getState().logout();
        });
    }
  }, [isAuthenticated, setUser]);

  return (
    <>
      <RouterProvider router={router} />
      <GlobalDialog />
    </>
  );
};
