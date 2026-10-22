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
  paymentMethod: z.string().optional(),

  // Internal booking notes (admin use)
  notes: z.string().optional(),

  // Optional booking representative contact snapshot (Phase 2.3)
  contactPerson: z.string().trim().optional(),
  contactEmail: z.union([z.string().email().trim().toLowerCase(), z.literal('')]).optional(),
  contactPhone: z.string().trim().optional(),

  // Optional billing/legal snapshot override (Phase 2.3)
  billingName: z.string().trim().optional(),
  billingGst: z.string().trim().toUpperCase().optional(),
  billingPan: z.string().trim().toUpperCase().optional(),
  billingAddress: z.string().trim().optional(),
  billingCity: z.string().trim().optional(),
  billingState: z.string().trim().optional(),
  billingPinCode: z.string().trim().optional(),
  billingCountry: z.string().trim().optional(),
  paymentReminderDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Payment reminder date must be in YYYY-MM-DD format'
    )
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, 'Invalid payment reminder date')
    .optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

