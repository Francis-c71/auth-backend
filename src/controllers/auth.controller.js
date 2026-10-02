import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as auth from '../services/auth.service.js';

const COOKIE_NAME = 'refreshToken';

const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent')?.slice(0, 255) });

const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  path: '/api/auth', // cookie is only sent to auth endpoints
  expires,
});

const readRefreshToken = (req) => req.cookies?.[COOKIE_NAME] ?? req.body?.refreshToken;

function sendSession(res, status, { user, accessToken, refreshToken, refreshExpiresAt }) {
  res.cookie(COOKIE_NAME, refreshToken, cookieOptions(refreshExpiresAt));
  res.status(status).json({
    status: 'success',
    accessToken,
    ...(env.RETURN_REFRESH_TOKEN_IN_BODY && { refreshToken }),
    user,
  });
}

const ok = (res, message) => res.json({ status: 'success', message });

export const register = asyncHandler(async (req, res) => {
  const user = await auth.register(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Account created. Please check your email to verify your address.',
    user,
  });
});

export const login = asyncHandler(async (req, res) => {
  sendSession(res, 200, await auth.login(req.body, meta(req)));
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    sendSession(res, 200, await auth.refresh(readRefreshToken(req), meta(req)));
  } catch (err) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await auth.logout(readRefreshToken(req));
  res.clearCookie(COOKIE_NAME, cookieOptions());
  ok(res, 'Logged out');
});

export const logoutAll = asyncHandler(async (req, res) => {
  await auth.logoutAll(req.user._id);
  res.clearCookie(COOKIE_NAME, cookieOptions());
  ok(res, 'Logged out of all devices');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await auth.verifyEmail(req.body.token);
  ok(res, 'Email verified');
});

export const resendVerification = asyncHandler(async (req, res) => {
  await auth.resendVerification(req.body.email);
  ok(res, 'If that account exists and is unverified, a new email has been sent');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await auth.forgotPassword(req.body.email);
  ok(res, 'If an account with that email exists, a reset link has been sent');
});

export const resetPassword = asyncHandler(async (req, res) => {
  await auth.resetPassword(req.body.token, req.body.password);
  res.clearCookie(COOKIE_NAME, cookieOptions());
  ok(res, 'Password reset. Please log in with your new password.');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  sendSession(res, 200, await auth.changePassword(req.user._id, currentPassword, newPassword, meta(req)));
});
