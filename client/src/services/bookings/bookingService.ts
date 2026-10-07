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
export interface CreateBookingPayload {
  exhibitionId?: string;
  stallIds: string[];
  companyId: string;
  discountAmount?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  paymentType: 'Partial' | 'FullPayment';
  percentage: number;
}

export interface CreateBookingResponse {
  amount: number;
  bookingId: string;
  bookingReference: string;
  currency: string;
  paymentId: string;
  razorpayKeyId: string;
  razorpayOrderId: string;
}

interface CreateBookingApiResponse {
  success: boolean;
  message: string;
  data: CreateBookingResponse;
}

export const bookingService = {
  createBooking: async (
    payload: CreateBookingPayload | AdminBookingPayload,
    options?: { token?: string }
  ): Promise<any> => {
    const config: any = {};
    if (options?.token) {
      config.headers = { Authorization: `Bearer ${options.token}` };
    }
    const response = await apiClient.post<any>(
      '/bookings',
      payload,
      config
    );
    return response.data?.data || response.data || response;
  },

  getMyBookings: async (): Promise<Booking[]> => {
    const res: any = await apiClient.get('/bookings/my-bookings');
    const rawData = res?.data ?? res;
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray(rawData?.bookings)) return rawData.bookings;
    return rawData || [];
  },

  getBookingById: async (id: string): Promise<Booking> => {
    const res: any = await apiClient.get(`/bookings/${id}`);
    return res.data;
  },

  getPublicBookingSummary: async (idOrRef: string): Promise<any> => {
    const res: any = await apiClient.get(`/bookings/public/summary/${idOrRef}`);
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
