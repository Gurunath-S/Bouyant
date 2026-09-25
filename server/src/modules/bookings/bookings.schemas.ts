import { z } from 'zod';

export const CreateBookingSchema = z.object({
  exhibitionId: z.string().uuid('Invalid exhibition ID'),
  stallIds: z
    .array(z.string().uuid('Invalid stall ID'))
    .min(1, 'At least one stall must be selected')
    .refine((items) => new Set(items).size === items.length, {
      message: 'Requested stall IDs must be unique without duplicates',
    }),
  idempotencyKey: z.string().optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  confirmDirectly: z.boolean().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
