// Talk to mongoDB using JS language,
// with more added functions.
import mongoose from 'mongoose';

// Prevent brute force or dictionary attack, 
// rainbow table attack and 
// plaintext leak
import bcrypt from 'bcryptjs';

import { env } from '../config/env.js';

export const ROLES = ['user', 'admin'];

// The select prevent you from accidentally send password to the frontend
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'user' },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date },

    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function () {
  // Email updated but not password, don't rehash
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);

  // Avoid race condition

  // Backdate 1s,
  // so a token issued right after the change is still valid, 
  // i.e., 1s less

  // Date.now()(12:00:02) is a mongoDB save time, 
  // which is 1s later after hashing at 12:00:01, 
  // Subtract 1s to avoid a token old by 1s to be accepted,
  // i.e., 1s more

  // Only set this on password change,
  // not on registration
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

// To avoid writing bcrypt.compare everywhere
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Create the collection users in mongoDB
export const User = mongoose.model('User', userSchema);
