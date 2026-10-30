import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  /** 
   * Tell Mongoose to be strict about the fields that appear inside MongoDB query filters.
   * e.g `emial` is omitted
   * and most importantly striping off `isAdmin=true` if the
   * attacker tries `GET /users?isAdmin=true`
   * i.e Only allow filtering by fields that are in my schema, if someone
   * tries to filter by unknown field, remove it. Its for typo + security.
   */
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected');
}

export const disconnectDB = () => mongoose.disconnect();
