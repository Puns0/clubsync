import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from './config.js';
import type { CryptoService } from './crypto.js';
import type { Logger } from './logger.js';
import { SESSION } from '@clubsync/shared';
import { AppError } from './errors.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      sessionToken?: string;
      user?: {
        id: string;
        email: string;
        role: 'STUDENT' | 'ORGANIZER' | 'ADMIN';
        organizerStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
        emailVerifiedAt: Date | null;
        disabledAt: Date | null;
      };
      requestId?: string;
    }
  }
}

const COOKIE_NAME = 'cs_sid';
const SLIDING_MS = SESSION.SLIDING_DAYS * 24 * 60 * 60 * 1000;

/** Session middleware: loads session from cookie, sets req.user. */
export function sessionMiddleware(
  prisma: PrismaClient,
  crypto: CryptoService,
  config: AppConfig,
  logger: Logger,
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Dev auth bypass
      if (config.DEV_AUTH_BYPASS && config.isDev) {
        const devEmail = req.headers['x-dev-user'] as string | undefined;
        if (devEmail) {
          const user = await prisma.user.findUnique({ where: { email: devEmail.toLowerCase() } });
          if (user) {
            req.user = {
              id: user.id,
              email: user.email,
              role: user.role,
              organizerStatus: user.organizerStatus,
              emailVerifiedAt: user.emailVerifiedAt,
              disabledAt: user.disabledAt,
            };
            return next();
          }
        }
      }

      const token = req.cookies?.[COOKIE_NAME] as string | undefined;
      if (!token) return next();

      const tokenHash = crypto.sha256(token);
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        if (session) {
          await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        }
        return next();
      }

      // Sliding expiry — extend if more than 1 hour since last seen
      const now = new Date();
      if (now.getTime() - session.lastSeenAt.getTime() > 3600_000) {
        const newExpiry = new Date(Math.min(
          now.getTime() + SLIDING_MS,
          session.createdAt.getTime() + SESSION.ABSOLUTE_CAP_DAYS * 24 * 60 * 60 * 1000,
        ));
        await prisma.session.update({
          where: { id: session.id },
          data: { lastSeenAt: now, expiresAt: newExpiry },
        });
      }

      req.sessionId = session.id;
      req.sessionToken = token;
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizerStatus: session.user.organizerStatus,
        emailVerifiedAt: session.user.emailVerifiedAt,
        disabledAt: session.user.disabledAt,
      };

      next();
    } catch (err) {
      logger.error({ err }, 'Session middleware error');
      next();
    }
  };
}

/** CSRF middleware: validates x-csrf-token on state-changing requests. */
export function csrfMiddleware(crypto: CryptoService, config: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    // Skip CSRF for public endpoints (no session)
    if (!req.user) return next();

    // Check Origin header
    const origin = req.headers['origin'];
    if (origin && origin !== config.APP_ORIGIN) {
      throw new AppError('CSRF_INVALID', 'Origin mismatch');
    }

    // Check CSRF token
    const token = req.headers['x-csrf-token'] as string | undefined;
    if (!token || !req.sessionId) {
      throw new AppError('CSRF_INVALID', 'Missing CSRF token');
    }

    if (!crypto.verifyCsrf(token, req.sessionId)) {
      throw new AppError('CSRF_INVALID', 'Invalid CSRF token');
    }

    next();
  };
}

/** Create a session and set the cookie. Returns the session ID and CSRF token. */
export async function createSession(
  prisma: PrismaClient,
  crypto: CryptoService,
  config: AppConfig,
  res: Response,
  userId: string,
  ip?: string,
  userAgent?: string,
): Promise<{ sessionId: string; csrfToken: string }> {
  const token = crypto.randomToken(32);
  const tokenHash = crypto.sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SLIDING_MS);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });

  const isHttps = config.APP_ORIGIN.startsWith('https');
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: SLIDING_MS,
  });

  return {
    sessionId: session.id,
    csrfToken: crypto.signCsrf(session.id),
  };
}

/** Destroy a session and clear the cookie. */
export async function destroySession(
  prisma: PrismaClient,
  res: Response,
  sessionId: string,
): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  res.clearCookie(COOKIE_NAME, { httpOnly: true, path: '/' });
}
