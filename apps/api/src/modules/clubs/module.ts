import { defineModule, defineRoute } from '../../core/module.js';
import { AppError } from '../../core/errors.js';
import { isOrganizerOfClub } from '../auth/public.js';

export default defineModule({
  id: 'clubs',
  part: 1,
  register({ prisma, audit }) {
    defineRoute('clubs.list', async (req, res) => {
      const clubs = await prisma.club.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
      });
      res.json({ items: clubs, nextCursor: null });
    });

    defineRoute('clubs.get', async (req, res) => {
      const { clubId } = req.params as { clubId: string };
      const club = await prisma.club.findUnique({
        where: { id: clubId, archivedAt: null },
      });
      if (!club) throw new AppError('NOT_FOUND', 'Club not found');

      const organizerCount = await prisma.clubOrganizer.count({
        where: { clubId, approvedAt: { not: null } },
      });

      const upcomingEventCount = await prisma.event.count({
        where: { clubId, status: 'SCHEDULED', endsAt: { gt: new Date() } },
      });

      res.json({ ...club, organizerCount, upcomingEventCount });
    });

    defineRoute('clubs.update', async (req, res) => {
      const { clubId } = req.params as { clubId: string };
      const { name, description } = req.body;

      if (req.user!.role !== 'ADMIN') {
        const isOrganizer = await isOrganizerOfClub(prisma, req.user!.id, clubId);
        if (!isOrganizer) throw new AppError('FORBIDDEN', 'You are not an organizer of this club');
      }

      const club = await prisma.club.update({
        where: { id: clubId },
        data: {
          name,
          description,
        },
      });

      await audit.record({
        actorId: req.user!.id,
        action: 'UPDATE_CLUB',
        targetType: 'CLUB',
        targetId: club.id,
        meta: { name, description },
      });

      res.json(club);
    });

    defineRoute('venues.list', async (req, res) => {
      const venues = await prisma.venue.findMany({ orderBy: { name: 'asc' } });
      res.json({ items: venues });
    });
  },
});
