/**
 * Notification DTOs — first draft by Part 1.
 * Part 2 owns this file and may refine schemas (additive only).
 */
import { z } from 'zod';

export const NotificationDTOSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'SEAT_CONFIRMED', 'WAITLISTED', 'PROMOTED', 'PROMOTION_EXPIRED',
    'SEAT_RELEASED', 'EVENT_UPDATED', 'EVENT_CANCELLED', 'CLASH_WARNING',
    'REMINDER', 'CHECKED_IN', 'ORGANIZER_APPROVED', 'ORGANIZER_REJECTED',
  ]),
  title: z.string(),
  body: z.string(),
  payload: z.record(z.unknown()),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type NotificationDTO = z.infer<typeof NotificationDTOSchema>;

export const UnreadCountResponseSchema = z.object({
  count: z.number(),
});
