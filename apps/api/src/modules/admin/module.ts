import { defineModule, defineRoute } from '../../core/module.js';
import { AppError } from '../../core/errors.js';
import { organizerApprovedEmailHtml, organizerRejectedEmailHtml } from '../../core/mail.js';

export default defineModule({
  id: 'admin',
  part: 1,
  register({ prisma, audit, mailer, settings }) {
    defineRoute('admin.stats', async (req, res) => {
      const [totalStudents, totalOrganizers, totalAdmins, totalClubs, totalVenues, pendingOrganizerRequests, totalEvents] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'ORGANIZER' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.club.count({ where: { archivedAt: null } }),
        prisma.venue.count(),
        prisma.user.count({ where: { role: 'ORGANIZER', organizerStatus: 'PENDING' } }),
        prisma.event.count(),
      ]);

      res.json({
        totalStudents,
        totalOrganizers,
        totalAdmins,
        totalClubs,
        totalVenues,
        pendingOrganizerRequests,
        totalEvents,
      });
    });

    defineRoute('admin.organizerRequests.list', async (req, res) => {
      const status = req.query.status as any;
      const limit = Number(req.query.limit) || 20;

      const users = await prisma.user.findMany({
        where: { role: 'ORGANIZER', ...(status ? { organizerStatus: status } : {}) },
        include: { clubLinks: { include: { club: true } } },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const items = users.map(u => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        department: u.department,
        year: u.year,
        organizerStatus: u.organizerStatus,
        organizerNote: u.organizerNote,
        requestedClubIds: u.clubLinks.map(c => c.clubId),
        assignedClubIds: u.clubLinks.filter(c => c.approvedAt).map(c => c.clubId),
        assignedClubs: u.clubLinks.filter(c => c.approvedAt).map(c => ({ id: c.clubId, name: c.club.name })),
        createdAt: u.createdAt.toISOString(),
      }));

      res.json({ items, nextCursor: null });
    });

    defineRoute('admin.organizerRequests.approve', async (req, res) => {
      const { userId } = req.params as { userId: string };
      const { clubIds } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId, role: 'ORGANIZER' } });
      if (!user) throw new AppError('NOT_FOUND', 'Organizer request not found');

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { organizerStatus: 'APPROVED' },
        });

        // Add them to requested clubs
        for (const clubId of clubIds) {
          await tx.clubOrganizer.upsert({
            where: { userId_clubId: { userId, clubId } },
            create: { userId, clubId, approvedById: req.user!.id, approvedAt: new Date() },
            update: { approvedById: req.user!.id, approvedAt: new Date() },
          });
        }
      });

      const clubs = await prisma.club.findMany({ where: { id: { in: clubIds } } });
      await mailer.send({
        to: user.email,
        subject: 'ClubSync Organizer Request Approved',
        html: organizerApprovedEmailHtml(user.name, clubs.map(c => c.name)),
      });

      await audit.record({ actorId: req.user!.id, action: 'APPROVE_ORGANIZER', targetType: 'USER', targetId: userId, meta: { clubIds } });
      res.json({ message: 'Organizer approved' });
    });

    defineRoute('admin.organizerRequests.reject', async (req, res) => {
      const { userId } = req.params as { userId: string };
      const { reason } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId, role: 'ORGANIZER' } });
      if (!user) throw new AppError('NOT_FOUND', 'Organizer request not found');

      await prisma.user.update({
        where: { id: userId },
        data: { organizerStatus: 'REJECTED' },
      });

      await mailer.send({
        to: user.email,
        subject: 'ClubSync Organizer Request Update',
        html: organizerRejectedEmailHtml(user.name, reason),
      });

      await audit.record({ actorId: req.user!.id, action: 'REJECT_ORGANIZER', targetType: 'USER', targetId: userId, meta: { reason } });
      res.json({ message: 'Organizer rejected' });
    });

    // Venues
    defineRoute('admin.venues.create', async (req, res) => {
      const { name } = req.body;
      const venue = await prisma.venue.create({ data: { name } });
      await audit.record({ actorId: req.user!.id, action: 'CREATE_VENUE', targetType: 'VENUE', targetId: venue.id, meta: { name } });
      res.json(venue);
    });

    defineRoute('admin.venues.update', async (req, res) => {
      const { venueId } = req.params as { venueId: string };
      const { name } = req.body;
      const venue = await prisma.venue.update({ where: { id: venueId }, data: { name } });
      await audit.record({ actorId: req.user!.id, action: 'UPDATE_VENUE', targetType: 'VENUE', targetId: venue.id, meta: { name } });
      res.json(venue);
    });

    defineRoute('admin.venues.delete', async (req, res) => {
      const { venueId } = req.params as { venueId: string };
      // Check if used
      const used = await prisma.event.count({ where: { venueId } });
      if (used > 0) throw new AppError('CONFLICT', 'Cannot delete venue that has events');
      
      await prisma.venue.delete({ where: { id: venueId } });
      await audit.record({ actorId: req.user!.id, action: 'DELETE_VENUE', targetType: 'VENUE', targetId: venueId });
      res.json({ message: 'Venue deleted' });
    });

    // Clubs
    defineRoute('admin.clubs.create', async (req, res) => {
      const { name, description } = req.body;
      const club = await prisma.club.create({ data: { name, description } });
      await audit.record({ actorId: req.user!.id, action: 'CREATE_CLUB', targetType: 'CLUB', targetId: club.id, meta: { name } });
      res.json(club);
    });

    defineRoute('admin.clubs.update', async (req, res) => {
      const { clubId } = req.params as { clubId: string };
      const { name, description } = req.body;
      const club = await prisma.club.update({ where: { id: clubId }, data: { name, description } });
      await audit.record({ actorId: req.user!.id, action: 'UPDATE_CLUB', targetType: 'CLUB', targetId: club.id, meta: { name, description } });
      res.json(club);
    });

    defineRoute('admin.clubs.archive', async (req, res) => {
      const { clubId } = req.params as { clubId: string };
      const club = await prisma.club.update({ where: { id: clubId }, data: { archivedAt: new Date() } });
      await audit.record({ actorId: req.user!.id, action: 'ARCHIVE_CLUB', targetType: 'CLUB', targetId: club.id });
      res.json({ message: 'Club archived' });
    });

    // Club Organizers
    defineRoute('admin.clubs.addOrganizer', async (req, res) => {
      const { clubId } = req.params as { clubId: string };
      const { userId } = req.body;
      await prisma.clubOrganizer.upsert({
        where: { userId_clubId: { userId, clubId } },
        create: { userId, clubId, approvedById: req.user!.id, approvedAt: new Date() },
        update: { approvedById: req.user!.id, approvedAt: new Date() },
      });
      await prisma.user.update({ where: { id: userId }, data: { organizerStatus: 'APPROVED' } });
      await audit.record({ actorId: req.user!.id, action: 'ADD_CLUB_ORGANIZER', targetType: 'CLUB', targetId: clubId, meta: { userId } });
      res.json({ message: 'Organizer added' });
    });

    defineRoute('admin.clubs.removeOrganizer', async (req, res) => {
      const { clubId, userId } = req.params as { clubId: string, userId: string };
      await prisma.clubOrganizer.delete({ where: { userId_clubId: { userId, clubId } } });
      await audit.record({ actorId: req.user!.id, action: 'REMOVE_CLUB_ORGANIZER', targetType: 'CLUB', targetId: clubId, meta: { userId } });
      res.json({ message: 'Organizer removed' });
    });

    // Users
    defineRoute('admin.users.list', async (req, res) => {
      const role = req.query.role as any;
      const limit = Number(req.query.limit) || 20;
      const users = await prisma.user.findMany({
        where: { ...(role ? { role } : {}) },
        include: { clubLinks: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      const items = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        usn: undefined, // omitted for admin list for privacy unless needed
        department: u.department,
        year: u.year,
        role: u.role,
        organizerStatus: u.organizerStatus,
        emailVerified: u.emailVerifiedAt !== null,
        organizerClubIds: u.clubLinks.map(c => c.clubId),
        disabledAt: u.disabledAt ? u.disabledAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
      }));
      res.json({ items, nextCursor: null });
    });

    defineRoute('admin.users.update', async (req, res) => {
      const { userId } = req.params as { userId: string };
      const { disabled } = req.body;
      const disabledAt = disabled ? new Date() : null;
      await prisma.user.update({ where: { id: userId }, data: { disabledAt } });
      if (disabled) await prisma.session.deleteMany({ where: { userId } });
      await audit.record({ actorId: req.user!.id, action: 'UPDATE_USER', targetType: 'USER', targetId: userId, meta: { disabled } });
      res.json({ message: 'User updated' });
    });

    // Settings
    defineRoute('admin.settings.get', async (req, res) => {
      const appSettings = await settings.get();
      res.json(appSettings);
    });

    defineRoute('admin.settings.update', async (req, res) => {
      await settings.setMultiple(req.body, req.user!.id);
      await audit.record({ actorId: req.user!.id, action: 'UPDATE_SETTINGS', targetType: 'SYSTEM', meta: req.body });
      res.json(await settings.get());
    });

    // Audit Log
    defineRoute('admin.audit.list', async (req, res) => {
      const action = req.query.action as any;
      const limit = Number(req.query.limit) || 20;
      const logs = await prisma.auditLog.findMany({
        where: { ...(action ? { action } : {}) },
        take: limit,
        orderBy: { at: 'desc' },
      });
      const items = logs.map(l => ({
        ...l,
        actorName: null,
        meta: l.meta as any,
        at: l.at.toISOString(),
      }));
      res.json({ items, nextCursor: null });
    });
  },
});
