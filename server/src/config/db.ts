import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('⚡ PostgreSQL connected via Prisma');
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
  }
};
