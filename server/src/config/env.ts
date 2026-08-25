import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/buoyant_media?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-buoyant-media-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'super-secret-refresh-key-buoyant-media-2026',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  STALL_HOLD_DURATION_MINUTES: parseInt(process.env.STALL_HOLD_DURATION_MINUTES || '10', 10),
};
