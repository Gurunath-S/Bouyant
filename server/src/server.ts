import dns from 'dns';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { getRedisClient } from './config/redis.js';
import { StallsService } from './modules/stalls/stalls.service.js';
import { verifyEmailTransporter } from './services/email.service.js';

// Guarantee process-wide IPv4 precedence (prevents ENETUNREACH in IPv6-restricted environments like Render)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Gracefully fallback on older runtimes
}

const startServer = async () => {
  console.log('🚀 Initializing Buoyant Media Server...');

  // Connect Database & Services
  await connectDB();
  getRedisClient();
  // Verify email transporter in background so it never delays HTTP server port binding
  verifyEmailTransporter().catch((err) => {
    console.error('⚠️ [EMAIL SERVICE] Background verification error:', err?.message || err);
  });

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
