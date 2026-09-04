import { Request, Response, NextFunction } from 'express';
import {
  FeatherlessAuthError,
  FeatherlessRateLimitError,
  FeatherlessModelError,
  FeatherlessTimeoutError,
  FeatherlessServiceError,
  FeatherlessEmptyResponseError,
} from '../services/featherless.service';
import { InvalidAIResponseError } from '../services/analysis.service';
import {
  YouTubeInvalidUrlError,
  YouTubeVideoNotFoundError,
  YouTubeCommentsDisabledError,
  YouTubePrivateVideoError,
  YouTubeQuotaExceededError,
  YouTubeApiError,
} from '../services/youtube.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-middleware');

interface AppError extends Error {
  statusCode?: number;
}

/**
 * Global error handler middleware.
 * Maps typed errors to appropriate HTTP responses.
 * Never exposes raw provider errors or credentials.
 */
export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  logger.error(
    {
      error: err.name,
      message: err.message,
      path: req.path,
      method: req.method,
    },
    'Request error'
  );

  // -----------------------------------------------------------
  // Featherless AI errors
  // -----------------------------------------------------------

  if (err instanceof FeatherlessAuthError) {
    res.status(500).json({
      success: false,
      error: {
        code: 'AI_AUTH_ERROR',
        message: 'AI service authentication failed. Please contact support.',
      },
    });
    return;
  }

  if (err instanceof FeatherlessRateLimitError) {
    res.status(429).json({
      success: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: 'AI service is temporarily busy. Please try again shortly.',
      },
    });
    return;
  }

  if (err instanceof FeatherlessModelError) {
    res.status(503).json({
      success: false,
      error: {
        code: 'AI_MODEL_ERROR',
        message: 'The AI model is currently unavailable.',
      },
    });
    return;
  }

  if (err instanceof FeatherlessTimeoutError) {
    res.status(504).json({
      success: false,
      error: {
        code: 'AI_TIMEOUT',
        message: 'AI analysis timed out. Please try again.',
      },
    });
    return;
  }

  if (
    err instanceof FeatherlessEmptyResponseError ||
    err instanceof InvalidAIResponseError
  ) {
    res.status(502).json({
      success: false,
      error: {
        code: 'AI_INVALID_RESPONSE',
        message: 'The AI returned an invalid response. Please try again.',
      },
    });
    return;
  }

  if (err instanceof FeatherlessServiceError) {
    res.status(502).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI analysis is temporarily unavailable.',
      },
    });
    return;
  }

  // -----------------------------------------------------------
  // YouTube errors
  // -----------------------------------------------------------

  if (err instanceof YouTubeInvalidUrlError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'YOUTUBE_INVALID_URL',
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof YouTubeVideoNotFoundError) {
    res.status(404).json({
      success: false,
      error: {
        code: 'YOUTUBE_VIDEO_NOT_FOUND',
        message: 'The YouTube video could not be found.',
      },
    });
    return;
  }

  if (err instanceof YouTubeCommentsDisabledError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'YOUTUBE_COMMENTS_DISABLED',
        message: 'Comments are disabled for this video.',
      },
    });
    return;
  }

  if (err instanceof YouTubePrivateVideoError) {
    res.status(403).json({
      success: false,
      error: {
        code: 'YOUTUBE_PRIVATE_VIDEO',
        message: 'This video is private or unavailable.',
      },
    });
    return;
  }

  if (err instanceof YouTubeQuotaExceededError) {
    res.status(429).json({
      success: false,
      error: {
        code: 'YOUTUBE_QUOTA_EXCEEDED',
        message: 'YouTube API quota has been exceeded. Please try again later.',
      },
    });
    return;
  }

  if (err instanceof YouTubeApiError) {
    res.status(502).json({
      success: false,
      error: {
        code: 'YOUTUBE_API_ERROR',
        message: 'Unable to fetch comments from this video.',
      },
    });
    return;
  }

  // -----------------------------------------------------------
  // Fallback — unexpected errors
  // -----------------------------------------------------------

  logger.error({ stack: err.stack }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
}

/**
 * 404 handler for unknown routes.
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found.`,
    },
  });
}
