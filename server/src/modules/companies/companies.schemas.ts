import { z } from 'zod';

export const CreateCompanySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  designation: z.string().min(2, 'Designation is required'),
  mobile: z.string().min(8, 'Mobile number is required'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  industry: z.string().min(2, 'Industry is required'),
  category: z.string().min(2, 'Product/Service Category is required'),
  website: z.string().url('Invalid website URL').or(z.literal('')).optional(),
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
