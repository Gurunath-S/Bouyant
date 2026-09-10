import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  phone: z.string().optional(),
  spcode: z.string().trim().toUpperCase().optional(),
});

export const LoginSchema = z.object({
  email: z.string().min(1, 'Email address or Staff SP Code is required'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
