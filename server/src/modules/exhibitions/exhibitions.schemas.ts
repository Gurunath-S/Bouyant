import { z } from 'zod';

export const CreateExhibitionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  venue: z.string().min(3, 'Venue is required'),
  city: z.string().min(2, 'City is required'),
  startDate: z.string(),
  endDate: z.string(),
  bannerUrl: z.string().optional().or(z.literal('')),
  totalStalls: z.number().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const UpdateExhibitionSchema = CreateExhibitionSchema.partial();

export type CreateExhibitionInput = z.infer<typeof CreateExhibitionSchema>;
export type UpdateExhibitionInput = z.infer<typeof UpdateExhibitionSchema>;
