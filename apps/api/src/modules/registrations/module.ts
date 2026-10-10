import { defineModule, defineRoute } from '../../core/module.js';
import { RegistrationsService } from './service.js';

export default defineModule({
  id: 'registrations',
  part: 1,
  register(ctx) {
    const service = new RegistrationsService(ctx);

    defineRoute('registrations.register', async (req, res) => {
      const { eventId } = req.params as { eventId: string };
      const { preferred } = req.body;
      const result = await service.registerTransaction(eventId, req.user!.id, preferred);
      
      // TODO: Emit socket events
      // TODO: Send emails/notifications
      
      res.json({
        outcome: result.status,
        registration: result.registration,
      });
    });

    defineRoute('registrations.cancel', async (req, res) => {
      const { registrationId } = req.params as { registrationId: string };
      await service.cancelAndRelease(registrationId, 'USER');
      res.json({ message: 'Cancelled successfully' });
    });

    // TODO: implement swap, confirm, decline
  },
  jobs: [
    {
      name: 'promotion-worker',
      cron: `*/${process.env.WORKER_TICK_SECONDS || 5} * * * * *`,
      async run(ctx) {
        // Expire pending offers
        const expired = await ctx.prisma.registration.findMany({
          where: { status: 'PROMOTED_PENDING', expiresAt: { lte: new Date() } },
        });

        for (const reg of expired) {
          await ctx.prisma.$transaction(async (tx) => {
            const current = await tx.registration.findUnique({ where: { id: reg.id } });
            if (current?.status === 'PROMOTED_PENDING' && current.expiresAt && current.expiresAt <= new Date()) {
              await tx.registration.update({
                where: { id: reg.id },
                data: { status: 'CANCELLED', cancelReason: 'EXPIRED', cancelledAt: new Date() }
              });
              const service = new RegistrationsService(ctx);
              await service.promoteNext(reg.eventId, tx);
            }
          });
        }

        // Periodic sweep
        const eventsWithWaitlist = await ctx.prisma.event.findMany({
          where: { status: 'SCHEDULED', startsAt: { gt: new Date() } },
          include: {
            registrations: {
              where: { status: 'WAITLISTED' }
            }
          }
        });

        for (const event of eventsWithWaitlist) {
          if (event.registrations.length > 0) {
            const seatsTaken = await ctx.prisma.registration.count({
              where: { eventId: event.id, status: { in: ['CONFIRMED', 'PROMOTED_PENDING', 'ATTENDED', 'NO_SHOW'] } }
            });
            if (seatsTaken < event.capacity) {
              await ctx.prisma.$transaction(async (tx) => {
                await tx.$executeRawUnsafe(`SELECT * FROM "events" WHERE "id" = '${event.id}' FOR UPDATE`);
                const service = new RegistrationsService(ctx);
                await service.promoteNext(event.id, tx);
              });
            }
          }
        }
      }
    }
  ]
});
