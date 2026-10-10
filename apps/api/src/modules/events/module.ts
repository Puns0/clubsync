import { defineModule, defineRoute } from '../../core/module.js';
import { EventsService } from './service.js';

export default defineModule({
  id: 'events',
  part: 1,
  register(ctx) {
    const service = new EventsService(ctx);

    defineRoute('events.venueCheck', async (req, res) => {
      const { venueId, startsAt, endsAt, excludeEventId } = req.body;
      const result = await service.checkVenueAvailability(venueId, startsAt, endsAt, excludeEventId);
      res.json(result);
    });

    defineRoute('events.scan', async (req, res) => {
      const { eventId } = req.params as { eventId: string };
      const { token } = req.body as { token: string };
      const result = await service.scanTicket(eventId, token, req.user!.id);
      res.json(result);
    });

    // We will register other event endpoints here
  },
  jobs: [
    {
      name: 'mark-no-shows',
      cron: `*/10 * * * *`, // Run every 10 minutes
      async run(ctx) {
        // Find events that have ended
        const pastEvents = await ctx.prisma.event.findMany({
          where: {
            status: 'SCHEDULED',
            endsAt: { lt: new Date() }
          }
        });

        for (const event of pastEvents) {
          // Update all CONFIRMED to NO_SHOW
          const result = await ctx.prisma.registration.updateMany({
            where: {
              eventId: event.id,
              status: 'CONFIRMED'
            },
            data: {
              status: 'NO_SHOW'
            }
          });
          if (result.count > 0) {
            ctx.log.info(`Marked ${result.count} seats as NO_SHOW for event ${event.id}`);
          }
        }
      }
    }
  ]
});
