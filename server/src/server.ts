import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { getRedisClient } from './config/redis.js';
import { StallsService } from './modules/stalls/stalls.service.js';

const startServer = async () => {
  console.log('🚀 Initializing Buoyant Media Server...');

  // Connect Database & Services
  await connectDB();
  getRedisClient();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`🌐 Server running on http://localhost:${env.PORT} in [${env.NODE_ENV}] mode`);
  });

  // Background cron-like worker for releasing expired stall holds every 30 seconds
  setInterval(async () => {
    try {
      await StallsService.releaseExpiredHolds();
    } catch (err) {
      console.warn('⚠️ Background stall hold release check warning:', err);
    }
  }, 30 * 1000);

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('🛑 Gracefully shutting down HTTP server...');
    server.close(() => {
      console.log('🔒 HTTP Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((error) => {
  console.error('💥 Fatal Server Initialization Error:', error);
  process.exit(1);
});
