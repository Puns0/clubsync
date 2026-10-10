import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../core/errors.js';
import type { Role } from '@clubsync/shared';

/**
 * PART 2 REPLACES THIS STUB.
 * Signature to keep:
 * requireAuth(req, res, next)
 * requireRole(...roles)
 */

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED', 'You must be logged in');
  }
  if (req.user.disabledAt) {
    throw new AppError('ACCOUNT_DISABLED', 'Your account has been disabled');
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');
    if (req.user.disabledAt) throw new AppError('ACCOUNT_DISABLED', 'Your account has been disabled');

    if (!roles.includes(req.user.role as Role)) {
      throw new AppError('FORBIDDEN', 'You do not have permission to access this resource');
    }

    // Block pending/rejected organizers from organizer-only endpoints
    if (
      roles.includes('ORGANIZER') &&
      !roles.includes('ADMIN') &&
      req.user.role === 'ORGANIZER' &&
      req.user.organizerStatus !== 'APPROVED'
    ) {
      throw new AppError('ORGANIZER_PENDING', 'Your organizer account is pending approval');
    }

    next();
  };
}

/** Dev Auth Middleware (Part 1 Stub) */
export function devAuthMiddleware(prisma: PrismaClient) {
  const allowDevAuth = process.env.ALLOW_DEV_AUTH === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (allowDevAuth && isProd) {
    console.error('FATAL: App must refuse to start if ALLOW_DEV_AUTH=true and NODE_ENV=production');
    process.exit(1);
  }

  return async (req: Request, _res: Response, next: NextFunction) => {
    if (allowDevAuth) {
      const devUserId = req.headers['x-dev-user-id'] as string | undefined;
      if (devUserId) {
        const user = await prisma.user.findUnique({ where: { id: devUserId } });
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            organizerStatus: user.organizerStatus,
            emailVerifiedAt: user.emailVerifiedAt,
            disabledAt: user.disabledAt,
          };
        }
      }
    }
    next();
  };
}
