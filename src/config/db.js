import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  // Tell Mongoose to be strict about the fields that appear inside MongoDB query filters.
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected');
}

export const disconnectDB = () => mongoose.disconnect();
