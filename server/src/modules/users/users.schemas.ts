import { z } from 'zod';

export const CreateAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().optional().nullable(),
  spcode: z.string().trim().toUpperCase().optional().nullable(),
});

export const CreateStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().optional().nullable(),
  spcode: z.string().trim().toUpperCase().optional().nullable(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  phone: z.string().optional().nullable(),
  spcode: z.string().trim().toUpperCase().optional().nullable(),
});

export const ToggleUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});

export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export type CreateAdminInput = z.infer<typeof CreateAdminSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ToggleUserStatusInput = z.infer<typeof ToggleUserStatusSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
