import { apiClient } from '../api/apiClient';
import { Company } from '../../types';

export const companyService = {
  getMyCompany: async (): Promise<Company> => {
    const res: any = await apiClient.get('/companies/my-company');
    return res.data;
  },

  getMyCompanies: async (): Promise<Company[]> => {
    try {
      const res: any = await apiClient.get('/companies/my-company');
      return res.data ? [res.data] : [];
    } catch {
      return [];
    }
  },

  getCompanyById: async (id: string): Promise<Company> => {
    const res: any = await apiClient.get(`/companies/${id}`);
    return res.data;
  },

  createCompany: async (data: any): Promise<any> => {
    const res: any = await apiClient.post('/companies', data);
    return res.data;
  },

  verifyGst: async (gstNumber: string, edition?: string, eventCode?: string, spcode?: string, year?: string) => {
    const res: any = await apiClient.post('/companies/verify-gst', { gstNumber, edition, eventCode, spcode, year });
    return res.data;
  },

  updateCompany: async (id: string, data: any): Promise<Company> => {
    const res: any = await apiClient.put(`/companies/${id}`, data);
    return res.data;
  },

  listCompanies: async (
    page = 1,
    search = '',
    exhibitionId?: string,
    status?: string,
    limit = 50
  ) => {
    const res: any = await apiClient.get('/companies', {
      params: {
        page,
        limit,
        search: search || undefined,
        exhibitionId: exhibitionId || undefined,
        status: status || undefined,
      },
    });
    return res;
  },
};
