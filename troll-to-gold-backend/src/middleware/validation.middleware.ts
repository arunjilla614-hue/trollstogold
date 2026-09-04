import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { createLogger } from '../utils/logger';

const logger = createLogger('validation-middleware');

/**
 * Creates a validation middleware for a given Zod schema.
 * Validates req.body and returns HTTP 400 on failure.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors;
      const firstError = errors[0];

      const message = firstError
        ? `${firstError.path.join('.')}: ${firstError.message}`.replace(
            /^: /,
            ''
          )
        : 'Request validation failed';

      logger.warn({ errors, path: req.path }, 'Request validation failed');

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      });
      return;
    }

    // Attach validated+coerced data back to the request
    req.body = result.data;
    next();
  };
}
