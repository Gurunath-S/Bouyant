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

  createCompany: async (data: any): Promise<Company> => {
    const res: any = await apiClient.post('/companies', data);
    return res.data;
  },

  updateCompany: async (id: string, data: any): Promise<Company> => {
    const res: any = await apiClient.put(`/companies/${id}`, data);
    return res.data;
  },

  listCompanies: async (page = 1, search = '') => {
    const res: any = await apiClient.get('/companies', { params: { page, search } });
    return res;
  },
};
