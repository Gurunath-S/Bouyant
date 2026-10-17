import { apiClient } from '../api/apiClient';
import {
  ReportOverviewData,
  OccupancyReportData,
  Exhibition,
  ReportFilters,
  DetailedReportParams,
  DetailedRecordsResponse,
} from '../../types';

export const reportService = {
  getOverview: async (filters?: string | ReportFilters): Promise<ReportOverviewData> => {
    const filterObj: ReportFilters = typeof filters === 'string' ? { exhibitionId: filters } : (filters || {});
    const params: Record<string, string> = {};
    if (filterObj.exhibitionId && filterObj.exhibitionId !== 'ALL') {
      params.exhibitionId = filterObj.exhibitionId;
    }
    if (filterObj.startDate) params.startDate = filterObj.startDate;
    if (filterObj.endDate) params.endDate = filterObj.endDate;
    if (filterObj.status && filterObj.status !== 'ALL') params.status = filterObj.status;
    if (filterObj.paymentStatus && filterObj.paymentStatus !== 'ALL') params.paymentStatus = filterObj.paymentStatus;

    const res: any = await apiClient.get('/reports/overview', { params });
    return res.data;
  },

  getExhibitions: async (): Promise<Exhibition[]> => {
    const res: any = await apiClient.get('/reports/exhibitions');
    return res.data;
  },

  getOccupancy: async (filters?: string | ReportFilters): Promise<OccupancyReportData> => {
    const filterObj: ReportFilters = typeof filters === 'string' ? { exhibitionId: filters } : (filters || {});
    const params: Record<string, string> = {};
    if (filterObj.exhibitionId && filterObj.exhibitionId !== 'ALL') {
      params.exhibitionId = filterObj.exhibitionId;
    }
    if (filterObj.startDate) params.startDate = filterObj.startDate;
    if (filterObj.endDate) params.endDate = filterObj.endDate;

    const res: any = await apiClient.get('/reports/occupancy', { params });
    return res.data;
  },

  getDetails: async (params: DetailedReportParams): Promise<DetailedRecordsResponse> => {
    const queryParams: Record<string, any> = {
      type: params.type,
      page: params.page || 1,
      limit: params.limit || 10,
    };
    if (params.exhibitionId && params.exhibitionId !== 'ALL') {
      queryParams.exhibitionId = params.exhibitionId;
    }
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params.paymentStatus && params.paymentStatus !== 'ALL') queryParams.paymentStatus = params.paymentStatus;
    if (params.search && params.search.trim()) queryParams.search = params.search.trim();

    const res: any = await apiClient.get('/reports/details', { params: queryParams });
    return res.data;
  },

  downloadCsv: async (params: DetailedReportParams): Promise<void> => {
    const queryParams: Record<string, any> = {
      type: params.type,
    };
    if (params.exhibitionId && params.exhibitionId !== 'ALL') {
      queryParams.exhibitionId = params.exhibitionId;
    }
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params.paymentStatus && params.paymentStatus !== 'ALL') queryParams.paymentStatus = params.paymentStatus;
    if (params.search && params.search.trim()) queryParams.search = params.search.trim();

    const res = await apiClient.get('/reports/export', {
      params: queryParams,
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buoyant-report-${params.type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
