import { z } from 'zod';
import { ROLES } from '../models/User.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const updateMeSchema = {
  body: z.object({ name: z.string().trim().min(1).max(80) }).strict(),
};

export const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export const updateRoleSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ role: z.enum(ROLES) }).strict(),
};
