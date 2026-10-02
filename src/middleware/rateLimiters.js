import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { status: 'error', message },
  });

const MIN = 60 * 1000;

export const globalLimiter = make(15 * MIN, 300, 'Too many requests, please try again later');
export const authLimiter = make(15 * MIN, 20, 'Too many attempts, please try again later');
export const sensitiveLimiter = make(60 * MIN, 5, 'Too many requests, please try again in an hour');
