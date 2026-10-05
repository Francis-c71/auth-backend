// Stops you from writing try/catch block in every controller

// Runs a function: fn(req, res, next),
// make sure eveb if it throws, make sure it's a Promise
// and if error, pass it to the Express error handler

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
