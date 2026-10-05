
// Updating your own name
// Listing users
// Changing a user's role

import { z } from 'zod';
import { ROLES } from '../models/User.js';

// ^       → start
// [a-f\d] → hexadecimal characters
// {24}    → exactly 24 characters
// $       → end
// i       → uppercase/lowercase doesn't matter
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// Is this a valid request for a user changing their own name?
export const updateMeSchema = {
  body: z.object({ name: z.string().trim().min(1).max(80) }).strict(),
};

// Are the pagination values valid?
export const listUsersSchema = {
  query: z.object({
    // The number of page.
    page: z.coerce.number().int().min(1).default(1),
    // How many users are returned per page.
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

// Is this a valid user ID, and is the requested role actually allowed?
export const updateRoleSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ role: z.enum(ROLES) }).strict(),
};
