import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { signAccessToken, generateToken, hashToken } from '../utils/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

// Used to keep login timing similar when the email doesn't exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', env.BCRYPT_ROUNDS);

// Fire-and-forget so response time doesn't reveal whether an email exists.
const notify = (promise) => promise.catch((e) => console.error('[email] failed:', e.message));

const invalidCredentials = () => new AppError('Invalid email or password', 401);

/* ------------------------------ sessions ------------------------------ */

async function issueSession(user, meta = {}, family = crypto.randomUUID()) {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hash,
    family,
    expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return { accessToken: signAccessToken(user), refreshToken: raw, refreshExpiresAt: expiresAt };
}

export async function logoutAll(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

/**
 * Rotates a refresh token. Each token is single-use; presenting an already-used
 * token means it was likely stolen, so the whole token family is revoked.
 */
export async function refresh(rawToken, meta) {
  if (!rawToken) throw new AppError('Refresh token missing', 401);

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  // Atomic claim: only one concurrent request can consume a given token.
  const current = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } }
  );

  if (!current) {
    const reused = await RefreshToken.findOne({ tokenHash });
    if (reused?.revokedAt) {
      await RefreshToken.updateMany({ family: reused.family, revokedAt: null }, { $set: { revokedAt: now } });
    }
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(current.user);
  if (!user) throw new AppError('User no longer exists', 401);

  const session = await issueSession(user, meta, current.family);
  return { user, ...session };
}

/* --------------------------- registration flow --------------------------- */

export async function register({ name, email, password }) {
  if (await User.exists({ email })) throw new AppError('Email is already registered', 409);

  const { raw, hash } = generateToken();
  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hash,
    emailVerificationExpires: new Date(Date.now() + VERIFY_TTL_MS),
  });

  notify(sendVerificationEmail(user, raw));
  return user;
}

export async function verifyEmail(token) {
  const user = await User.findOne({
    emailVerificationToken: hashToken(token),
    emailVerificationExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('Invalid or expired verification token', 400);

  await User.updateOne(
    { _id: user._id },
    { $set: { isEmailVerified: true }, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } }
  );
}

export async function resendVerification(email) {
  const user = await User.findOne({ email });
  if (!user || user.isEmailVerified) return; // silent: don't reveal account state

  const { raw, hash } = generateToken();
  await User.updateOne(
    { _id: user._id },
    { $set: { emailVerificationToken: hash, emailVerificationExpires: new Date(Date.now() + VERIFY_TTL_MS) } }
  );
  notify(sendVerificationEmail(user, raw));
}

/* --------------------------------- login --------------------------------- */

export async function login({ email, password }, meta) {
  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalidCredentials();
  }

  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new AppError('Account temporarily locked due to too many failed attempts. Try again later.', 423);
  }

  if (!(await user.comparePassword(password))) {
    const lockExpired = user.lockUntil && user.lockUntil <= Date.now();
    const attempts = (lockExpired ? 0 : user.failedLoginAttempts) + 1;
    const shouldLock = attempts >= env.MAX_LOGIN_ATTEMPTS;

    await User.updateOne(
      { _id: user._id },
      shouldLock
        ? { $set: { failedLoginAttempts: 0, lockUntil: new Date(Date.now() + env.LOCK_TIME_MINUTES * 60 * 1000) } }
        : { $set: { failedLoginAttempts: attempts }, $unset: { lockUntil: 1 } }
    );
    throw invalidCredentials();
  }

  if (env.REQUIRE_EMAIL_VERIFICATION && !user.isEmailVerified) {
    throw new AppError('Please verify your email address before logging in', 403);
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } }
  );

  const session = await issueSession(user, meta);
  return { user, ...session };
}

/* ---------------------------- password management ---------------------------- */

export async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) return; // silent: don't reveal whether the account exists

  const { raw, hash } = generateToken();
  await User.updateOne(
    { _id: user._id },
    { $set: { passwordResetToken: hash, passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) } }
  );
  notify(sendPasswordResetEmail(user, raw));
}

export async function resetPassword(token, newPassword) {
  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +failedLoginAttempts +lockUntil');

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = newPassword;
  user.isEmailVerified = true; // they proved control of the inbox
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  await logoutAll(user._id); // sign out everywhere
}

export async function changePassword(userId, currentPassword, newPassword, meta) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError('User not found', 404);

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }
  if (currentPassword === newPassword) {
    throw new AppError('New password must be different from the current password', 400);
  }

  user.password = newPassword;
  await user.save();

  await logoutAll(user._id);
  const session = await issueSession(user, meta); // keep this device signed in
  return { user, ...session };
}
