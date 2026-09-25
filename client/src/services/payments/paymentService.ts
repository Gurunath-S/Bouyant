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
    bookingId: string;
    action: 'SUCCESS' | 'FAILED' | 'CANCELLED';
    paymentMethod?: string;
    transactionId?: string;
  }) => {
    const res: any = await apiClient.post('/payments/verify', data);
    return res.data;
  },

  getAllPayments: async () => {
    const res: any = await apiClient.get('/payments');
    const rawData = res?.data ?? res;
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray(rawData?.payments)) return rawData.payments;
    return rawData || [];
  },
};
