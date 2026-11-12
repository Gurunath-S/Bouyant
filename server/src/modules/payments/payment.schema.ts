import { z } from 'zod';

export const CashPaymentSchema = z.object({
  bookingId: z
    .string()
    .min(1, 'Booking ID is required.'),

  amount: z.coerce
    .number()
    .finite()
    .positive('Cash payment amount must be greater than zero.')
    .refine(
      (amount) => Number.isSafeInteger(amount * 100),
      'Cash amount must have at most two decimal places.'
    ),

  nextDueDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Next due date must be in YYYY-MM-DD format.'
    )
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, 'Invalid next payment due date')
    .optional(),
});


export const VerifyChequeSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required.'),
  status: z.enum(['CHEQUE_VERIFIED', 'CHEQUE_REJECTED'], {
    errorMap: () => ({
      message: 'Status must be either CHEQUE_VERIFIED or CHEQUE_REJECTED.',
    }),
  }),
  rejectionReason: z
    .string()
    .trim()
    .optional(),
});

export const ChequePaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required.'),
  paymentType: z
    .string()
    .transform((val) => val.toUpperCase())
    .refine((val) => ['FULL', 'PARTIAL'].includes(val), {
      message: 'Invalid payment type',
    })
    .optional()
    .default('FULL'),
  amount: z.coerce
    .number()
    .finite()
    .positive('Cheque payment amount must be greater than zero.')
    .refine(
      (amount) => Number.isSafeInteger(amount * 100),
      'Cheque amount must have at most two decimal places.'
    ),
  chequeNumber: z.string().trim().min(1, 'Cheque number is required.'),
  bankName: z.string().trim().min(1, 'Bank & branch name is required.'),
  chequeDate: z
      .string()
      .min(1, 'Cheque date is required')
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Cheque date must be in YYYY-MM-DD format'
      )
      .refine((val) => {
        // 1. Real Calendar date check (rejects invalid dates like 2026-02-30)
        const date = new Date(`${val}T00:00:00.000Z`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === val
        );
      }, 'Invalid cheque date')
      .refine((val) => {
        // 2. Today or Future date check (cannot be in the past)
        const today = new Date().toISOString().slice(0, 10);
        return val >= today;
      }, 'Cheque date cannot be in the past. It must be today or a future date'),
  referenceNote: z.string().trim().optional(),
  nextDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Next due date must be in YYYY-MM-DD format.')
    .optional(),
   
});

export type ChequePaymentInput = z.infer<typeof ChequePaymentSchema>;

export type VerifyChequeInput = z.infer<typeof VerifyChequeSchema>;