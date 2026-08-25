import { z } from 'zod';

export const CreateBookingSchema = z.object({
  exhibitionId: z.string().uuid('Invalid exhibition ID'),
  stallId: z.string().uuid('Invalid stall ID'),
  companyId: z.string().uuid('Invalid company ID').optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
