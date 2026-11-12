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
    plan?: string;
  }) => {
    const res: any = await apiClient.get('/payments', { params });
    return res;
  },

  createBalanceOrder: async (bookingId: string, payload?: { amount?: number; nextDueDate?: string }) => {
    const res: any = await apiClient.post(`/payments/balance/${bookingId}`, payload || {});
    return res?.data?.data || res?.data || res;
  },

   recordCashPayment: async (payload: {
    bookingId: string;
    amount: number;
    nextDueDate?: string;
  }) => {
    const res: any = await apiClient.post(
      '/payments/cash',
      payload
    );

    return res?.data?.data || res?.data || res;
  },

  deletePayment: async (paymentId: string) => {
    const res: any = await apiClient.delete(`/payments/${paymentId}`);
    return res?.data?.data || res?.data || res;
  },
    // SuperAdmin verify or reject offline cheque
  verifyChequePayment: async (payload: {
    paymentId: string;
    status: 'CHEQUE_VERIFIED' | 'CHEQUE_REJECTED';
    rejectionReason?: string;
  }) => {
    const res: any = await apiClient.post('/payments/cheque-verify', payload);
    return res?.data?.data || res?.data || res;
  },

    recordChequePayment: async (payload: {
    bookingId: string;
    amount: number;
    chequeDetails: {
      chequeNumber: string;
      bankName: string;
      chequeDate: string;
      referenceNote?: string;
    };
    nextDueDate?: string;
    paymentType?:string;
  }) => {
    const res: any = await apiClient.post('/payments/cheque', {
      bookingId: payload.bookingId,
      amount: payload.amount,
      chequeNumber: payload.chequeDetails.chequeNumber,
      bankName: payload.chequeDetails.bankName,
      chequeDate: payload.chequeDetails.chequeDate,
      referenceNote: payload.chequeDetails.referenceNote,
      nextDueDate: payload.nextDueDate,
      paymentType:payload.paymentType
    });
    return res?.data?.data || res?.data || res;
  },
};


