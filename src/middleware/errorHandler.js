import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) =>
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err.code === 11000) {
    status = 409;
    message = 'Resource already exists';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else {
    console.error(err);
    if (!env.isProd) message = err.message;
  }

  res.status(status).json({
    status: 'error',
    message,
    ...(details && { errors: details }),
    ...(!env.isProd && status === 500 && { stack: err.stack }),
  });
}
