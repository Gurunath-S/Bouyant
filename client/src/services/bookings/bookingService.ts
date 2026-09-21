import { apiClient } from '../api/apiClient';
import { Booking } from '../../types';

export interface AdminBookingPayload {
  exhibitionId: string;
  stallIds: string[];
  companyId?: string;
  confirmDirectly?: boolean;
  paymentMethod?: string;
  notes?: string;
}

export const bookingService = {
  createBooking: async (data: {
    exhibitionId?: string;
    stallId?: string;
    stallIds?: string[];
    companyId?: string;
    confirmDirectly?: boolean;
    paymentMethod?: string;
    notes?: string;
  }): Promise<Booking> => {
    const payload = {
      ...data,
      stallIds: data.stallIds || (data.stallId ? [data.stallId] : []),
    };
    const res: any = await apiClient.post('/bookings', payload);
    return res.data;
  },

  getMyBookings: async (): Promise<Booking[]> => {
    const res: any = await apiClient.get('/bookings/my-bookings');
    return res.data;
  },

  getBookingById: async (id: string): Promise<Booking> => {
    const res: any = await apiClient.get(`/bookings/${id}`);
    return res.data;
  },

  getAllBookings: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    registeredByRole?: string;
    exhibitionId?: string;
  }) => {
    const res: any = await apiClient.get('/bookings', { params });
    return res;
  },
};
