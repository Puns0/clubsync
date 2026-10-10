import { ErrorCode, ERROR_HTTP_STATUS } from '@clubsync/shared';
import type { Request, Response, NextFunction } from 'express';
import type { Logger } from './logger.js';

/** Application error that maps to a contract error response. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  get httpStatus(): number {
    return ERROR_HTTP_STATUS[this.code];
  }
}

/** Central error handler — must be the last middleware. */
export function errorHandler(logger: Logger) {
  return (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.httpStatus).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    // Zod validation errors from body parsing
    if (err.name === 'ZodError') {
      res.status(400).json({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: (err as { issues?: unknown }).issues,
        },
      });
      return;
    }

    // JSON parse error
    if ((err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid JSON in request body',
        },
      });
      return;
    }

    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
      error: {
        code: ErrorCode.INTERNAL,
        message: 'An unexpected error occurred',
      },
    });
  };
}
