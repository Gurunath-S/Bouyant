import { apiClient } from '../api/apiClient';
import { AdminStaffUser, CreateAdminStaffPayload, CreateUserPayload, UpdateUserPayload } from '../../types';

export const userService = {
  getUsers: async (
    roleOrFilters?:
      | string
      | {
          role?: string;
          search?: string;
          status?: string;
          exhibitionId?: string;
          page?: number;
          limit?: number;
        },
    searchArg?: string
  ): Promise<any> => {
    const params: any = {};
    if (typeof roleOrFilters === 'object' && roleOrFilters !== null) {
      if (roleOrFilters.role && roleOrFilters.role !== 'ALL') params.role = roleOrFilters.role;
      if (roleOrFilters.search) params.search = roleOrFilters.search;
      if (roleOrFilters.status && roleOrFilters.status !== 'ALL') params.status = roleOrFilters.status;
      if (roleOrFilters.exhibitionId && roleOrFilters.exhibitionId !== 'ALL') params.exhibitionId = roleOrFilters.exhibitionId;
      if (roleOrFilters.page) params.page = roleOrFilters.page;
      if (roleOrFilters.limit) params.limit = roleOrFilters.limit;
    } else {
      if (roleOrFilters && roleOrFilters !== 'ALL') params.role = roleOrFilters;
      if (searchArg) params.search = searchArg;
    }
    const res: any = await apiClient.get('/users', { params });
    return res;
  },

  getUserById: async (id: string): Promise<AdminStaffUser> => {
    const res: any = await apiClient.get(`/users/${id}`);
    return res.data;
  },

  createUser: async (data: CreateUserPayload): Promise<AdminStaffUser> => {
    const res: any = await apiClient.post('/users', data);
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

  resetPassword: async (
    id: string,
    newPassword: string,
    sendEmailNotification: boolean = true,
    newUsername?: string
  ): Promise<{ message: string; emailSent?: boolean; username?: string }> => {
    const res: any = await apiClient.post(`/users/${id}/reset-password`, {
      newPassword,
      sendEmailNotification,
      newUsername,
    });
    return res.data;
  },

  deleteUser: async (id: string): Promise<{ message: string; id: string }> => {
    const res: any = await apiClient.delete(`/users/${id}`);
    return res.data;
  },
};
