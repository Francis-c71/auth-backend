import { Router } from 'express';
import * as c from '../7_controllers/auth.controller.js';
import { authenticate } from '../5_middleware/auth.js';
import { validate } from '../5_middleware/validate.js';
import { authLimiter, sensitiveLimiter } from '../5_middleware/rateLimiters.js';
import * as v from '../3_validators/auth.validators.js';

const r = Router();

r.post('/register', authLimiter, validate(v.registerSchema), c.register);
r.post('/login', authLimiter, validate(v.loginSchema), c.login);
r.post('/refresh', authLimiter, validate(v.refreshSchema), c.refresh);
r.post('/logout', validate(v.refreshSchema), c.logout);
r.post('/logout-all', authenticate, c.logoutAll);

r.post('/verify-email', authLimiter, validate(v.verifyEmailSchema), c.verifyEmail);
r.post('/resend-verification', sensitiveLimiter, validate(v.emailOnlySchema), c.resendVerification);


r.post('/forgot-password', sensitiveLimiter, validate(v.emailOnlySchema), c.forgotPassword);
r.post('/reset-password', authLimiter, validate(v.resetPasswordSchema), c.resetPassword);
r.post('/change-password', authenticate, validate(v.changePasswordSchema), c.changePassword);

export default r;
