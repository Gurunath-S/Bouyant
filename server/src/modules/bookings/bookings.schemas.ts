import { z } from 'zod';

export const CreateBookingSchema = z.object({
  exhibitionId: z.string().uuid('Invalid exhibition ID'),
  stallIds: z.array(z.string().uuid('Invalid stall ID')).min(1, 'At least one stall must be selected'),
  companyId: z.string().uuid('Invalid company ID'),
  
  discountAmount: z
    .number()
    .min(0, 'Discount amount cannot be negative')
    .optional(),

  discountType: z
    .enum(['PERCENT', 'AMOUNT'])
    .optional(),

  paymentType: z
    .enum(['Partial', 'FullPayment']),

  percentage: z
    .number()
    .min(10, 'Minimum partial payment is 10%')
    .max(100, 'Payment percentage cannot exceed 100%'),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
