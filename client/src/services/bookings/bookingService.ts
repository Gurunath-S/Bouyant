import { apiClient } from '../api/apiClient';
import { Booking,PaymentExecutionMethod} from '../../types';

export interface AdminBookingPayload {
  exhibitionId: string;
  stallIds: string[];
  companyId?: string;
  confirmDirectly?: boolean;
  paymentMethod?: string;
  paymentMode?: PaymentExecutionMethod;
  notes?: string;
}
export interface CreateBookingPayload {
  exhibitionId?: string;
  stallIds: string[];
  companyId: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingName?: string;
  billingGst?: string | null;
  billingPan?: string | null;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPinCode?: string;
  billingCountry?: string;
  discountAmount?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  paymentType: 'Partial' | 'FullPayment';
  percentage: number;
  confirmDirectly?: boolean;
  paymentMethod?: string;
  paymentMode?: PaymentExecutionMethod;
  notes?: string;
  paymentReminderDate?: string | null;
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

export interface CreateBookingApiResponse {
  success: boolean;
  message: string;
  data: CreateBookingResponse;
}

export const bookingService = {
  createBooking: async (
    payload: CreateBookingPayload | AdminBookingPayload,
    options?: { token?: string | null }
  ): Promise<any> => {
    const config: any = {};
    if (options?.token) {
      config.headers = { Authorization: `Bearer ${options.token}` };
    } else if (options?.token === null) {
      config.headers = { Authorization: '' };
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
    search?: string;
    status?: string;
    paymentStatus?: string;
    hasBalanceOnly?: boolean | string;
    registeredByRole?: string;
    exhibitionId?: string;
    userId?: string;
    bookedByUserId?: string;
    bookingSource?: string;
  }) => {
    const res: any = await apiClient.get('/bookings', { params });
    return res;
  },

  cancelBooking: async (
    bookingId: string,
    options?: { token?: string; reason?: string }
  ): Promise<any> => {
    const config: any = {};
    if (options?.token) {
      config.headers = { Authorization: `Bearer ${options.token}` };
    }
    const res: any = await apiClient.post(
      `/bookings/${bookingId}/cancel`,
      { reason: options?.reason },
      config
    );
    return res.data?.data || res.data || res;
  },

  deleteBooking: async (bookingId: string): Promise<any> => {
    const res: any = await apiClient.delete(`/bookings/${bookingId}`);
    return res.data?.data || res.data || res;
  },
};


