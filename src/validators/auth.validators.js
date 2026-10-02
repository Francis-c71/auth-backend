import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Invalid email address').max(254);

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long');

const token = z.string().min(20).max(200);

export const registerSchema = {
  body: z.object({ name: z.string().trim().min(1).max(80), email, password }).strict(),
};

export const loginSchema = {
  body: z.object({ email, password: z.string().min(1).max(128) }).strict(),
};

export const refreshSchema = {
  body: z.object({ refreshToken: token.optional() }).optional().default({}),
};

export const verifyEmailSchema = { body: z.object({ token }).strict() };
export const emailOnlySchema = { body: z.object({ email }).strict() };
export const resetPasswordSchema = { body: z.object({ token, password }).strict() };

export const changePasswordSchema = {
  body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict(),
};
