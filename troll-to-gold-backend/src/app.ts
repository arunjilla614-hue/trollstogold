import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import healthRouter from './routes/health.routes';
import analysisRouter from './routes/analysis.routes';
import conversionRouter from './routes/conversion.routes';
import youtubeRouter from './routes/youtube.routes';
import historyRouter from './routes/history.routes';
import categoryResponseRouter from './routes/category-response.routes';
import { createLogger } from './utils/logger';

const logger = createLogger('app');

// ============================================================
// Create Express application
// ============================================================

export function createApp(): express.Application {
  const app = express();

  // -----------------------------------------------------------
  // Security headers
  // -----------------------------------------------------------
  app.use(helmet());

  // -----------------------------------------------------------
  // CORS
  // -----------------------------------------------------------
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn({ origin }, 'CORS blocked origin');
          // Pass null + false: deny without creating an Error that could leak origin in response
          callback(null, false);
        }
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    })
  );

  // -----------------------------------------------------------
  // Body parsing — limit size to prevent abuse
  // -----------------------------------------------------------
  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: true, limit: '50kb' }));

  // -----------------------------------------------------------
  // Global rate limiting
  // -----------------------------------------------------------
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again in 15 minutes.',
      },
    },
  });

  // Stricter rate limit for AI endpoints (cost/quota protection)
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'AI_RATE_LIMIT_EXCEEDED',
        message: 'Too many AI requests. Please slow down.',
      },
    },
  });

  app.use(globalLimiter);

  // -----------------------------------------------------------
  // Request logging
  // -----------------------------------------------------------
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'Incoming request');
    next();
  });

  // -----------------------------------------------------------
  // Routes
  // -----------------------------------------------------------
  app.use('/api/health', healthRouter);
  app.use('/api/analyze', aiLimiter, analysisRouter);
  app.use('/api', aiLimiter, conversionRouter);
  app.use('/api/youtube', youtubeRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/category-response', categoryResponseRouter);

  // -----------------------------------------------------------
  // 404 + Global error handler
  // -----------------------------------------------------------
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
