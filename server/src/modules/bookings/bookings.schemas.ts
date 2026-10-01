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
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
