import rateLimit from 'express-rate-limit';


// Give me a time period, 
// a maximum number of requests, 
// and an error message, 
// and I'll create a rate limiter.

// IETF-Internet Engineering Task Force;
// provides 'draft-7' version of standard headers,
// and let's turn off the old legacy headers - for clean error info.
const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { status: 'error', message },
  });

// Convert a munute to milliseconds.
const MIN = 60 * 1000;

export const globalLimiter = make(15 * MIN, 300, 'Too many requests, please try again later');
export const authLimiter = make(15 * MIN, 20, 'Too many attempts, please try again later');
export const sensitiveLimiter = make(60 * MIN, 5, 'Too many requests, please try again in an hour');
