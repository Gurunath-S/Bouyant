import { z } from 'zod';

export const ExhibitionBaseSchema = z
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
    images: z.array(z.string()).optional().default([]),
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

const validateExhibitionPayload = (
  data: { startDate?: string; endDate?: string; notificationEmails?: string | null },
  ctx: z.RefinementCtx
) => {
  if (data.startDate && data.endDate) {
    const s = new Date(data.startDate);
    const e = new Date(data.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e <= s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exhibition end date & closing time must be strictly after start date & opening time',
        path: ['endDate'],
      });
    }
  }

  if (data.notificationEmails && data.notificationEmails.trim()) {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const emails = data.notificationEmails.split(',').map((e) => e.trim()).filter(Boolean);
    const invalid = emails.filter((e) => !emailRegex.test(e));
    if (invalid.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid recipient email format: ${invalid.map((e) => `"${e}"`).join(', ')}`,
        path: ['notificationEmails'],
      });
    }
  }
};

export const CreateExhibitionSchema = ExhibitionBaseSchema.superRefine(validateExhibitionPayload);

export const UpdateExhibitionSchema = ExhibitionBaseSchema.partial().superRefine(validateExhibitionPayload);

export type CreateExhibitionInput = z.infer<typeof CreateExhibitionSchema>;
export type UpdateExhibitionInput = z.infer<typeof UpdateExhibitionSchema>;
