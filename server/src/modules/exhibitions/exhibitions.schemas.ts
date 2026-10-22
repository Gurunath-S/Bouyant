import { z } from 'zod';

export const CreateExhibitionSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().optional(),
    edition: z.string().trim().optional(),
    eventCode: z.string().trim().optional(),
    spcode: z.string().trim().optional(),
    description: z.string().optional().default('Exhibition Event Details'),
    venue: z.string().optional().default('Exhibition Center'),
    address: z.string().optional().nullable().or(z.literal('')),
    city: z.string().optional().default('Mumbai'),
    state: z.string().optional().nullable().or(z.literal('')),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    category: z.string().optional().nullable().or(z.literal('')),
    startDate: z.string(),
    endDate: z.string(),
    bookingEndDate: z.string().optional().nullable().or(z.literal('')),
    bannerUrl: z.string().optional().or(z.literal('')),
    notificationEmails: z.string().optional().nullable().or(z.literal('')),
    totalStalls: z.number().optional(),
    status: z
      .preprocess(
        (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
        z.enum(['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED'])
      )
      .optional(),
    floorPlans: z.array(z.any()).optional(),
    layoutData: z.any().optional(),
    stalls: z.array(z.any()).optional(),
  })
  .passthrough();

export const UpdateExhibitionSchema = CreateExhibitionSchema.partial().passthrough();

export type CreateExhibitionInput = z.infer<typeof CreateExhibitionSchema>;
export type UpdateExhibitionInput = z.infer<typeof UpdateExhibitionSchema>;
