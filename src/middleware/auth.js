
// Check weather the user is logged in
// Check weather the user has a permission to access a particular route

import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';

// Requires a valid `Authorization: Bearer <accessToken>` header. Sets req.user
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('Authentication required', 401);

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('User no longer exists', 401);

  // Reject tokens issued before the last password change.
  // i.e., if the user changed their password after this access token was created, 
  // reject the old token.
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new AppError('Password was changed. Please log in again.', 401);
  }

  req.user = user;
  next();
});

// Role-based access control, the authorization 
// Used after authentication
export const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new AppError('You do not have permission to perform this action', 403));
