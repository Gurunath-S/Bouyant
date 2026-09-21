import { apiClient } from '../api/apiClient';
import { ReportOverviewData, OccupancyReportData, Exhibition } from '../../types';

export const reportService = {
  getOverview: async (): Promise<ReportOverviewData> => {
    const res: any = await apiClient.get('/reports/overview');
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
