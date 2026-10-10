import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import { AppError } from './errors.js';
import type { Role } from '@clubsync/shared';

/** Require any authenticated user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED', 'You must be logged in');
  }
  if (req.user.disabledAt) {
    throw new AppError('ACCOUNT_DISABLED', 'Your account has been disabled');
  }
  next();
}

/** Require one of the given roles. */
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

/** Require that the user is an approved organizer of the club specified by the route. */
export function requireClubOrganizer(getClubId: (req: Request) => string) {
  return (prisma: PrismaClient) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');

      // Admins bypass
      if (req.user.role === 'ADMIN') return next();

      const clubId = getClubId(req);
      const link = await prisma.clubOrganizer.findUnique({
        where: { userId_clubId: { userId: req.user.id, clubId } },
      });

      if (!link || !link.approvedAt) {
        throw new AppError('FORBIDDEN', 'You are not an organizer of this club');
      }

      next();
    };
  };
}

/** Require that the user is an organizer of the club owning the event. */
export function requireEventOrganizer(getEventId: (req: Request) => string) {
  return (prisma: PrismaClient) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user) throw new AppError('UNAUTHENTICATED', 'You must be logged in');

      // Admins bypass
      if (req.user.role === 'ADMIN') return next();

      const eventId = getEventId(req);
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { clubId: true } });
      if (!event) throw new AppError('NOT_FOUND', 'Event not found');

      const link = await prisma.clubOrganizer.findUnique({
        where: { userId_clubId: { userId: req.user.id, clubId: event.clubId } },
      });

      if (!link || !link.approvedAt) {
        throw new AppError('FORBIDDEN', 'You are not an organizer of this event\'s club');
      }

      next();
    };
  };
}

export const guards = { requireAuth, requireRole, requireClubOrganizer, requireEventOrganizer };
