import { z } from 'zod';

export const CreateExhibitionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  venue: z.string().min(3, 'Venue is required'),
  city: z.string().min(2, 'City is required'),
  startDate: z.string().datetime({ message: 'Invalid start date format' }),
  endDate: z.string().datetime({ message: 'Invalid end date format' }),
  bannerUrl: z.string().url('Invalid banner URL').optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const UpdateExhibitionSchema = CreateExhibitionSchema.partial();

export type CreateExhibitionInput = z.infer<typeof CreateExhibitionSchema>;
export type UpdateExhibitionInput = z.infer<typeof UpdateExhibitionSchema>;
