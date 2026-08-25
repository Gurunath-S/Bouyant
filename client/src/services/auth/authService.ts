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

  logout: async () => {
    await apiClient.post('/auth/logout');
  },
};
