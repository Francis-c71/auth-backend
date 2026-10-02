import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logoutAll } from '../services/auth.service.js';

export const getMe = (req, res) => res.json({ status: 'success', user: req.user });

export const updateMe = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  await req.user.save();
  res.json({ status: 'success', user: req.user });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(),
  ]);
  res.json({
    status: 'success',
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    throw new AppError('You cannot change your own role', 400);
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  await logoutAll(user._id); // force re-login so the new role applies cleanly
  res.json({ status: 'success', user });
});
