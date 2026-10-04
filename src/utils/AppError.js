// Add status code property to Error, 
// its standard has only message propety

// Operational error Vs Programming error

// Hide this constructor from the stack trace
// to see where AppError was thrown not
// where it was defined

// Only Chrome >= V8 has captureStackTrace, 
// chrome < V8, Firefox, Safari or Dena Doesn't
// the optional chaining prevents the app from crashing in the later browsers.
// Error.captureStackTrace?.(targetOject, hideFromHere = AppError class itself)

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
