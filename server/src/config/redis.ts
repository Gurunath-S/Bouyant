import Redis from 'ioredis';
import { env } from './env.js';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (!redisClient) {
    try {
      redisClient = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      redisClient.on('connect', () => {
        console.log('⚡ Redis Client connected');
      });

      redisClient.on('error', (err) => {
        // Soft fallback if Redis server is not running locally during dev/testing
        console.warn('⚠️ Redis connection notice:', err.message);
      });
    } catch (error) {
      console.warn('⚠️ Redis client initialization skipped:', error);
    }
  }
  return redisClient;
};
