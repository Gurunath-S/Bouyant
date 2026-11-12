import { z } from 'zod';

export const CreateBookingSchema = z.object({
  exhibitionId: z.string().min(1, 'Invalid exhibition ID'),
  stallIds: z.array(z.string().min(1, 'Invalid stall ID')).min(1, 'At least one stall must be selected'),
  companyId: z.string().min(1, 'Invalid company ID'),
  
  discountAmount: z
    .number()
    .min(0, 'Discount amount cannot be negative')
    .optional(),

  discountType: z
    .enum(['PERCENT', 'AMOUNT'])
    .optional(),

  paymentType: z
    .string()
    .transform((val) => val.toUpperCase())
    .refine((val) => ['FULL', 'PARTIAL', 'FULLPAYMENT', 'FULL_PAYMENT'].includes(val), {
      message: 'Invalid payment type',
    })
    .optional()
    .default('FULL'),

  percentage: z
    .number()
    .min(0, 'Minimum partial payment is 0%')
    .max(100, 'Payment percentage cannot exceed 100%')
    .optional()
    .default(100),

  // Admin / Staff / SuperAdmin only — bypass Razorpay and directly confirm the booking
  confirmDirectly: z.boolean().optional().default(false),

  // Optional payment method label recorded on the offline payment record
  paymentMethod: z.string().nullable().optional(),
  paymentMode: z.enum(['ONLINE_RAZORPAY', 'CASH',"CHEQUE"]).optional(),

  // Internal booking notes (admin use)
  notes: z.string().nullable().optional(),

  // Optional booking representative contact snapshot (Phase 2.3)
  contactPerson: z.string().trim().nullable().optional(),
  contactEmail: z.union([z.string().email().trim().toLowerCase(), z.literal(''), z.null()]).optional(),
  contactPhone: z.string().trim().nullable().optional(),

  // Optional billing/legal snapshot override (Phase 2.3)
  billingName: z.string().trim().nullable().optional(),
  billingGst: z.string().trim().toUpperCase().nullable().optional(),
  billingPan: z.string().trim().toUpperCase().nullable().optional(),
  billingAddress: z.string().trim().nullable().optional(),
  billingCity: z.string().trim().nullable().optional(),
  billingState: z.string().trim().nullable().optional(),
  billingPinCode: z.string().trim().nullable().optional(),
  billingCountry: z.string().trim().nullable().optional(),
    paymentReminderDate: z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Payment reminder date must be in YYYY-MM-DD format'
  )
  .refine((val) => {
    // 1. Real Calendar date check (rejects fake dates like Feb 30, April 31)
    const date = new Date(`${val}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === val
    );
  }, 'Invalid payment reminder date')
  .refine((val) => {
    // 2. Not in the past check (Today or future date only)
    const today = new Date().toISOString().slice(0, 10);
    return val >= today;
  }, 'Payment reminder date cannot be in the past')
  .nullable()
  .optional(),
      // Cheque payment details (optional)
  chequeDetails: z
  .object({
    chequeNumber: z
      .string()
      .trim()
      .min(1, 'Cheque number is required'),

    bankName: z
      .string()
      .trim()
      .min(1, 'Bank name is required'),

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

    referenceNote: z
      .string()
      .trim()
      .optional(),
  })
  .optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMode === 'CHEQUE' && !data.chequeDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['chequeDetails'],
      message: 'Cheque details are required for cheque payments',
    });
  }
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

