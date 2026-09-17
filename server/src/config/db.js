import { prisma } from '../infrastructure/database/prisma.js';
import { config } from './env.js';

export async function connectDB() {
  await prisma.$connect();
  console.log('[db] connected to PostgreSQL');
  return prisma;
}

export async function disconnectDB() {
  await prisma.$disconnect();
}

export { prisma };
