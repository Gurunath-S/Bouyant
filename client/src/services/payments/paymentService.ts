import { apiClient } from '../api/apiClient';

export const paymentService = {
  processPayment: async (data: {
    bookingId: string;
    amount: number;
    paymentMethod?: string;
  }) => {
    const res: any = await apiClient.post('/payments/verify', {
      bookingId: data.bookingId,
      action: 'SUCCESS',
      paymentMethod: data.paymentMethod || 'SIMULATED_GATEWAY',
    });
    return res.data;
  },

  verifyPayment: async (data: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    bookingId?: string;
    action?: string;
    paymentMethod?: string;
    transactionId?: string;
    payAmount?: number;
  }) => {
    const res: any = await apiClient.post('/payments/verify', data);
    return res.data;
  },

  getAllPayments: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    method?: string;
  }) => {
    const res: any = await apiClient.get('/payments', { params });
    return res;
  },

  createBalanceOrder: async (bookingId: string) => {
    const res: any = await apiClient.post(`/payments/balance/${bookingId}`);
    return res?.data?.data || res?.data || res;
  },
};
