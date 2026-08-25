import { apiClient } from '../api/apiClient';
import { Booking } from '../../types';

export const bookingService = {
  createBooking: async (data: { exhibitionId?: string; stallId: string; companyId?: string }): Promise<Booking> => {
    const res: any = await apiClient.post('/bookings', data);
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

  getAllBookings: async (page = 1, status?: string) => {
    const res: any = await apiClient.get('/bookings', { params: { page, status } });
    return res;
  },
};
