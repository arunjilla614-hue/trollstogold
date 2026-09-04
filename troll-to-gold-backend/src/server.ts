import { createApp } from './app';
import { env } from './config/env';
import logger from './utils/logger';

// ============================================================
// Start server
// ============================================================

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
      demoMode: env.DEMO_MODE,
      aiProvider: 'featherless',
      model: env.FEATHERLESS_MODEL,
    },
    '🚀 TrollToGold backend is running'
  );

  if (env.DEMO_MODE) {
    logger.warn(
      '⚠️  DEMO_MODE is active — using mock data. Set DEMO_MODE=false to use live APIs.'
    );
  }
});

// -----------------------------------------------------------
// Graceful shutdown
// -----------------------------------------------------------

function shutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

export default server;
