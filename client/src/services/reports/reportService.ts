import { apiClient } from '../api/apiClient';
import { ReportOverviewData, OccupancyReportData, Exhibition } from '../../types';

export const reportService = {
  getOverview: async (exhibitionId?: string): Promise<ReportOverviewData> => {
    const params = exhibitionId && exhibitionId !== 'ALL' ? { exhibitionId } : undefined;
    const res: any = await apiClient.get('/reports/overview', { params });
    return res.data;
  },

  getExhibitions: async (): Promise<Exhibition[]> => {
    const res: any = await apiClient.get('/reports/exhibitions');
    return res.data;
  },

  getOccupancy: async (): Promise<OccupancyReportData> => {
    const res: any = await apiClient.get('/reports/occupancy');
    return res.data;
  },
};
