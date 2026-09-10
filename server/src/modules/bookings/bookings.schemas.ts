import { z } from 'zod';

export const CreateBookingSchema = z.object({
  exhibitionId: z.string().uuid('Invalid exhibition ID'),
  stallIds: z.array(z.string().uuid('Invalid stall ID')).min(1, 'At least one stall must be selected'),
  companyId: z.string().uuid('Invalid company ID').optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
