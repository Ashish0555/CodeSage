import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Connect to MongoDB. Called once at startup (and by tests against an
 * in-memory server). Mongoose maintains an internal connection pool, so we
 * only ever call connect() once per process.
 */
export async function connectDB(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[db] connected to MongoDB');
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
