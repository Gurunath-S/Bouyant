import { apiClient } from '../api/apiClient';
import { AdminStaffUser, CreateAdminStaffPayload, UpdateUserPayload } from '../../types';

export const userService = {
  getUsers: async (role?: string, search?: string): Promise<AdminStaffUser[]> => {
    const params: any = {};
    if (role && role !== 'ALL') params.role = role;
    if (search) params.search = search;
    const res: any = await apiClient.get('/users', { params });
    return res.data;
  },

  getUserById: async (id: string): Promise<AdminStaffUser> => {
    const res: any = await apiClient.get(`/users/${id}`);
    return res.data;
  },

  createAdmin: async (data: CreateAdminStaffPayload): Promise<AdminStaffUser> => {
    const res: any = await apiClient.post('/users/admin', data);
    return res.data;
  },

  createStaff: async (data: CreateAdminStaffPayload): Promise<AdminStaffUser> => {
    const res: any = await apiClient.post('/users/staff', data);
    return res.data;
  },

  updateUser: async (id: string, data: UpdateUserPayload): Promise<AdminStaffUser> => {
    const res: any = await apiClient.put(`/users/${id}`, data);
    return res.data;
  },

  toggleStatus: async (id: string, isActive: boolean): Promise<AdminStaffUser> => {
    const res: any = await apiClient.patch(`/users/${id}/status`, { isActive });
    return res.data;
  },

  resetPassword: async (id: string, newPassword: string): Promise<{ message: string }> => {
    const res: any = await apiClient.post(`/users/${id}/reset-password`, { newPassword });
    return res.data;
  },
};
