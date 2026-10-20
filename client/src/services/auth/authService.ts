import { apiClient } from '../api/apiClient';
import { User } from '../../types';

export const authService = {
  register: async (data: any) => {
    const res: any = await apiClient.post('/auth/register', data);
    return res.data;
  },

  login: async (credentials: any) => {
    const res: any = await apiClient.post('/auth/login', credentials);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res: any = await apiClient.get('/auth/me');
    return res.data;
  },

  checkUsernameAvailability: async (username: string): Promise<{ available: boolean; message?: string }> => {
    const res: any = await apiClient.get('/auth/check-username', { params: { username } });
    return res.data;
  },

  lookupAccount: async (params: {
    email?: string;
    phone?: string;
    gstNumber?: string;
    companyName?: string;
  }): Promise<{
    exists: boolean;
    exactMatch?: boolean;
    companyExists?: boolean;
    username?: string | null;
    name?: string;
    email?: string;
    phone?: string;
    company?: any;
  }> => {
    const res: any = await apiClient.get('/auth/lookup-account', { params });
    return res.data;
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res: any = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const res: any = await apiClient.post('/auth/reset-password', { token, password });
    return res.data;
  },
};

