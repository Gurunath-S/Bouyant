import { z } from 'zod';

const gstNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z0-9]{13}$/, 'Invalid GST number');

export const CreateCompanySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required'),
  contactPerson: z.string().trim().min(2, 'Contact person is required'),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  email: z.string().trim().email('Invalid email address'),
  address: z.string().trim().min(5, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pinCode: z.string().trim().regex(/^\d{6}$/, "PIN code must be exactly 6 digits"),
  country: z.string().trim().min(2, 'Country is required'),
  gstNumber: gstNumberSchema,
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN number'),
  tanNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{4}[0-9]{5}[A-Z]$/, 'Invalid TAN number'),
  industry: z.string().trim().min(2, 'Industry is required'),
  website: z.string().trim().url('Invalid website URL').or(z.literal('')).optional(),
  remarks: z.string().trim().optional(),
});

export const GstVerificationSchema = z.object({
  gstNumber: gstNumberSchema,
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;