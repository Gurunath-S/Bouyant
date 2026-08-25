import { apiClient } from '../api/apiClient';
import { Stall } from '../../types';

export const stallService = {
  getStallsByFloorPlan: async (floorPlanId: string): Promise<Stall[]> => {
    const res: any = await apiClient.get(`/stalls/floor-plan/${floorPlanId}`);
    return res.data;
  },

  holdStall: async (stallId: string) => {
    const res: any = await apiClient.post('/stalls/hold', { stallId });
    return res.data;
  },

  releaseHold: async (stallId: string) => {
    const res: any = await apiClient.delete(`/stalls/hold/${stallId}`);
    return res.data;
  },

  createStall: async (data: any): Promise<Stall> => {
    const res: any = await apiClient.post('/stalls', data);
    return res.data;
  },

  updateStall: async (id: string, data: any): Promise<Stall> => {
    const res: any = await apiClient.put(`/stalls/${id}`, data);
    return res.data;
  },

  toggleBlockStall: async (id: string, block: boolean): Promise<Stall> => {
    const res: any = await apiClient.patch(`/stalls/${id}/block`, { block });
    return res.data;
  },
};
