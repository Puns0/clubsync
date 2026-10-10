/**
 * Events DTOs — first draft by Part 1.
 * Part 2 owns this file and may refine schemas (additive only).
 */
import { z } from 'zod';
import { DEPARTMENTS } from '../constants.js';

export const EventCardDTOSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  club: z.object({ id: z.string().uuid(), name: z.string() }),
  venue: z.object({ id: z.string().uuid(), name: z.string() }),
  startsAt: z.string(),
  endsAt: z.string(),
  capacity: z.number(),
  confirmedCount: z.number(),
  pendingCount: z.number(),
  waitlistCount: z.number(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']),
  phase: z.enum(['LIVE', 'TODAY', 'UPCOMING', 'PAST']),
  myStatus: z.enum(['CONFIRMED', 'WAITLISTED', 'PROMOTED_PENDING', 'CANCELLED', 'ATTENDED', 'NO_SHOW']).nullable(),
});
export type EventCardDTO = z.infer<typeof EventCardDTOSchema>;

export const EventDetailDTOSchema = EventCardDTOSchema.extend({
  description: z.string(),
  eligibleYears: z.array(z.number()),
  eligibleDepartments: z.array(z.string()),
  facultyCoordinator: z.string().nullable(),
  eligibility: z.object({
    eligible: z.boolean(),
    reason: z.string().optional(),
  }),
  myRegistration: z.any().nullable(), // RegistrationDTO, defined in registrations.ts
  myWaitlistPosition: z.number().nullable(),
});
export type EventDetailDTO = z.infer<typeof EventDetailDTOSchema>;

export const CreateEventBodySchema = z.object({
  clubId: z.string().uuid(),
  title: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).trim().default(''),
  venueId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().min(1).max(10000),
  eligibleYears: z.array(z.number().int().min(1).max(4)).default([]),
  eligibleDepartments: z.array(z.enum(DEPARTMENTS as unknown as [string, ...string[]])).default([]),
  facultyCoordinator: z.string().max(200).trim().optional(),
});

export const UpdateEventBodySchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  venueId: z.string().uuid().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  capacity: z.number().int().min(1).max(10000).optional(),
  eligibleYears: z.array(z.number().int().min(1).max(4)).optional(),
  eligibleDepartments: z.array(z.string()).optional(),
  facultyCoordinator: z.string().max(200).trim().nullable().optional(),
});

export const VenueCheckBodySchema = z.object({
  venueId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  excludeEventId: z.string().uuid().optional(),
});

export const VenueCheckResponseSchema = z.object({
  available: z.boolean(),
  conflicts: z.array(z.object({
    eventId: z.string().uuid(),
    title: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
  })),
});

export const EventFeedQuerySchema = z.object({
  phase: z.enum(['LIVE', 'TODAY', 'UPCOMING', 'PAST']).optional(),
  clubId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SeatMapDTOSchema = z.object({
  eventId: z.string().uuid(),
  capacity: z.number(),
  seats: z.array(z.object({
    index: z.number(),
    state: z.enum(['FREE', 'TAKEN', 'PENDING', 'MINE']),
  })),
  waitlistCount: z.number(),
  myPosition: z.number().nullable(),
});
export type SeatMapDTO = z.infer<typeof SeatMapDTOSchema>;

export const SetParticipationBodySchema = z.object({
  action: z.enum(['ATTENDED', 'NO_SHOW', 'REMOVE']),
});
