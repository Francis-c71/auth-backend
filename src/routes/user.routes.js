import { Router } from 'express';
import * as c from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as v from '../validators/user.validators.js';

const r = Router();

r.use(authenticate);

r.get('/me', c.getMe);
r.patch('/me', validate(v.updateMeSchema), c.updateMe);

// Admin only
r.get('/', authorize('admin'), validate(v.listUsersSchema), c.listUsers);
r.patch('/:id/role', authorize('admin'), validate(v.updateRoleSchema), c.updateUserRole);

export default r;
