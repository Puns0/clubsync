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

    // We will register other event endpoints here
  },
});
