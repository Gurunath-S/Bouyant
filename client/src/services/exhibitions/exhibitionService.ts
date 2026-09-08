import { apiClient } from '../api/apiClient';
import { Exhibition } from '../../types';

export const exhibitionService = {
  getExhibitions: async (status?: string, search?: string): Promise<Exhibition[]> => {
    const res: any = await apiClient.get('/exhibitions', {
      params: { status, search },
    });
    return res.data;
  },

  getExhibitionBySlug: async (slugOrId: string): Promise<Exhibition> => {
    const res: any = await apiClient.get(`/exhibitions/${slugOrId}`);
    return res.data;
  },

  createExhibition: async (data: any): Promise<Exhibition> => {
    const res: any = await apiClient.post('/exhibitions', data);
    return res.data;
  },

  updateExhibition: async (id: string, data: any): Promise<Exhibition> => {
    const res: any = await apiClient.put(`/exhibitions/${id}`, data);
    return res.data;
  },

  deleteExhibition: async (id: string): Promise<{ id: string; message: string }> => {
    const res: any = await apiClient.delete(`/exhibitions/${id}`);
    return res.data;
  },
};
