import { apiClient } from '../api/apiClient';
import { FloorPlan } from '../../types';

export const floorPlanService = {
  getFloorPlanById: async (id: string): Promise<FloorPlan> => {
    const res: any = await apiClient.get(`/floor-plans/${id}`);
    return res.data;
  },

  updateFloorPlan: async (id: string, data: any): Promise<FloorPlan> => {
    const res: any = await apiClient.put(`/floor-plans/${id}`, data);
    return res.data;
  },

  syncFloorPlan: async (
    id: string,
    data: { name?: string; width?: number; height?: number; layoutData: any; stalls: any[] }
  ): Promise<FloorPlan> => {
    const res: any = await apiClient.post(`/floor-plans/${id}/sync`, data);
    return res.data;
  },
};
