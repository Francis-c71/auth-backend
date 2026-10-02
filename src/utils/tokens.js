import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

/** SHA-256 of an opaque token. Only the hash is ever stored in the DB. */
export const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

/** Cryptographically random opaque token: give `raw` to the user, store `hash`. */
export function generateToken(bytes = 48) {
  const raw = crypto.randomBytes(bytes).toString('base64url');
  return { raw, hash: hashToken(raw) };
}
