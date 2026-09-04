import pino from 'pino';
import { env } from '../config/env';

const isDevelopment = env.NODE_ENV === 'development';
const isTest = env.NODE_ENV === 'test';

/**
 * Root logger instance.
 * In test mode, logging is suppressed (level: silent).
 * In development, pretty-printed with pino-pretty.
 * In production, JSON structured logs.
 */
const rootLogger = pino(
  {
    level: isTest ? 'silent' : isDevelopment ? 'debug' : 'info',
    base: {
      service: 'troll-to-gold-backend',
      env: env.NODE_ENV,
    },
    // Redact sensitive fields from all log output
    redact: {
      paths: [
        'headers.authorization',
        'headers.Authorization',
        'body.apiKey',
        'FEATHERLESS_API_KEY',
        'YOUTUBE_API_KEY',
      ],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname,service,env',
            },
          },
        }
      : {}),
  }
);

/**
 * Create a child logger with a module name label.
 */
export function createLogger(module: string): pino.Logger {
  return rootLogger.child({ module });
}

export default rootLogger;
