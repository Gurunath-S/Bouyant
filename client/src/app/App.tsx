import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/auth/authService';

export const App: React.FC = () => {
  const { setUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      authService
        .getMe()
        .then((user) => setUser(user))
        .catch(() => {
          // Token expired or invalid
        });
    }
  }, [isAuthenticated, setUser]);

  return <RouterProvider router={router} />;
};
