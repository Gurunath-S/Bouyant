import { z } from 'zod';
import { validateGstinStructure } from './utils/gstUtils.js';

const gstNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .superRefine((val, ctx) => {
    const res = validateGstinStructure(val);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error || 'Invalid GST number',
      });
    }
  });

export const CreateCompanySchema = z
  .object({
    name: z.string().trim().min(2, 'Company name is required'),
    contactPerson: z.string().trim().min(2, 'Contact person is required'),
    mobile: z.string().trim().regex(/^(\+91|0)?[6-9]\d{9}$/, 'Invalid 10-digit mobile number'),
    email: z.string().trim().email('Invalid email address'),
    address: z.string().trim().min(5, 'Address is required'),
    city: z.string().trim().min(2, 'City is required'),
    state: z.string().trim().min(2, 'State is required'),
    pinCode: z.string().trim().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits').optional().default('641001'),
    country: z.string().trim().optional().default('India'),
    gstNumber: gstNumberSchema,
    panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN number'),
    tanNumber: z.string().trim().toUpperCase().optional().or(z.literal('')),
    industry: z.string().trim().min(2, 'Industry is required'),
    website: z.string().trim().url('Invalid website URL').or(z.literal('')).optional(),
    remarks: z.string().trim().optional(),
    regNo: z.string().trim().optional(),
    spcode: z.string().trim().optional(),
    edition: z.string().trim().optional(),
    eventCode: z.string().trim().optional(),
    year: z.string().trim().optional(),
  })
  .passthrough()
  .refine(
    (data) => {
      // Security check: PAN must match the PAN embedded inside the 15-character GSTIN (characters 3-12)
      const cleanGst = data.gstNumber.trim().toUpperCase();
      const panFromGst = cleanGst.substring(2, 12);
      return data.panNumber.trim().toUpperCase() === panFromGst;
    },
    {
      message: 'PAN number must match the PAN encoded inside the GSTIN (characters 3-12)',
      path: ['panNumber'],
    }
  );

export const GstVerificationSchema = z
  .object({
    gstNumber: gstNumberSchema,
    edition: z.string().trim().optional(),
    eventCode: z.string().trim().optional(),
    spcode: z.string().trim().optional(),
  })
  .passthrough();

export const UpdateCompanySchema = z.object({
  name: z.string().trim().min(2).optional(),
  contactPerson: z.string().trim().min(2).optional(),
  mobile: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  address: z.string().trim().min(5).optional(),
  city: z.string().trim().min(2).optional(),
  state: z.string().trim().min(2).optional(),
  pinCode: z.string().trim().regex(/^\d{6}$/).optional(),
  country: z.string().trim().optional(),
  gstNumber: gstNumberSchema.optional(),
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  tanNumber: z.string().trim().toUpperCase().optional(),
  industry: z.string().trim().min(2).optional(),
  website: z.string().trim().url().or(z.literal('')).optional(),
  remarks: z.string().trim().optional(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;