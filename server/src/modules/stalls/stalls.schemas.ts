import { z } from 'zod';

export const CreateStallSchema = z.object({
  floorPlanId: z.string().uuid(),
  stallNumber: z.string().min(1, 'Stall number is required'),
  name: z.string().optional(),
  category: z.enum(['STANDARD', 'PREMIUM', 'CORNER', 'ISLAND']).default('STANDARD'),
  price: z.number().positive('Price must be greater than 0'),
  areaSqFt: z.number().positive().default(100),
  width: z.number().positive().default(100),
  height: z.number().positive().default(100),
  xPosition: z.number().default(0),
  yPosition: z.number().default(0),
  status: z.enum(['AVAILABLE', 'TEMPORARILY_HELD', 'BOOKING_IN_PROGRESS', 'PAYMENT_PENDING', 'BOOKED_CONFIRMED', 'BLOCKED']).optional(),
});

export const UpdateStallSchema = CreateStallSchema.partial().omit({ floorPlanId: true });

export const HoldStallSchema = z.object({
  stallId: z.string().uuid('Invalid stall ID'),
});

export type CreateStallInput = z.infer<typeof CreateStallSchema>;
export type UpdateStallInput = z.infer<typeof UpdateStallSchema>;
