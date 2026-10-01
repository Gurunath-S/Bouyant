import { z } from 'zod';

export const CreateCompanySchema = z
  .object({
    name: z.string().trim().min(1, 'Company name is required'),
    contactPerson: z.string().trim().min(1, 'Contact person is required'),
    mobile: z.string().trim().min(10, 'Mobile number is required'),
    email: z.string().trim().email('Invalid email address'),
    address: z.string().trim().min(1, 'Address is required'),
    city: z.string().trim().min(1, 'City is required'),
    state: z.string().trim().min(1, 'State is required'),
    pinCode: z.string().trim().optional().or(z.literal('')).default('641001'),
    country: z.string().trim().optional().default('India'),
    gstNumber: z.string().trim().toUpperCase().optional().or(z.literal('')),
    panNumber: z.string().trim().toUpperCase().optional().or(z.literal('')),
    tanNumber: z.string().trim().toUpperCase().optional().or(z.literal('')),
    industry: z.string().trim().min(1, 'Industry is required'),
    website: z.string().trim().optional().or(z.literal('')),
    remarks: z.string().trim().optional(),
    spcode: z.string().trim().optional(),
    edition: z.string().trim().optional(),
    eventCode: z.string().trim().optional(),
    year: z.string().trim().optional(),
    username: z.string().trim().optional().or(z.literal('')),
  })
  .passthrough();

export const GstVerificationSchema = z
  .object({
    gstNumber: z.string().trim().toUpperCase().min(1, 'GST number is required'),
    edition: z.string().trim().optional(),
    eventCode: z.string().trim().optional(),
    spcode: z.string().trim().optional(),
  })
  .passthrough();

export const UpdateCompanySchema = CreateCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;