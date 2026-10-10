import { PrismaClient } from '@prisma/client';
import { AppError } from '../../core/errors.js';
import { ModuleContext } from '../../core/module.js';

export class EventsService {
  constructor(private ctx: ModuleContext) {}

  async checkVenueAvailability(venueId: string, startsAt: string, endsAt: string, excludeEventId?: string) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (end <= start) {
      throw new AppError('VALIDATION_ERROR', 'endsAt must be after startsAt');
    }

    const conflictingEvents = await this.ctx.prisma.event.findMany({
      where: {
        venueId,
        status: 'SCHEDULED',
        id: excludeEventId ? { not: excludeEventId } : undefined,
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: {
        id: true,
        title: true,
        club: { select: { name: true } },
        startsAt: true,
        endsAt: true,
      }
    });

    return {
      available: conflictingEvents.length === 0,
      conflictingEvents: conflictingEvents.map(e => ({
        eventId: e.id,
        title: e.title,
        clubName: e.club.name,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
      }))
    };
  }

  // Other event logic like create, update, etc.
}
