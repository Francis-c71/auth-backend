// The name "Zod" is a reference to the 
// fictional comic book villain General Zod from Superman, 
// known for his phrase "Kneel before Zod!" 
// i.e., for data to conform to the schema rules, the validation rules.

// Is the data supplied by the client acceptable 
// before we let the authentication code process it?

import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Invalid email address').max(254);

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number')
  // How many bytes does this password occupy when encoded as UTF-8?
  // because bcrypt accept a maximum of 72 bytes
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password is too long');

const token = z.string().min(20).max(200);

// Don't allow extra properties, be strict
export const registerSchema = {
  body: z.object({ name: z.string().trim().min(1).max(80), email, password }).strict(),
};

// When loging in, you don't need to check weather the password is strong,
// you only need to check that it is provided
export const loginSchema = {
  body: z.object({ email, password: z.string().min(1).max(128) }).strict(),
};

// Supports a refresh token being supplied through another mechanism, such as a cookie.
export const refreshSchema = {
  body: z.object({ refreshToken: token.optional() }).optional().default({}),
};

export const verifyEmailSchema = { body: z.object({ token }).strict() };
export const emailOnlySchema = { body: z.object({ email }).strict() };
export const resetPasswordSchema = { body: z.object({ token, password }).strict() };

// The new password must follow the password rule
export const changePasswordSchema = {
  body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict(),
};
