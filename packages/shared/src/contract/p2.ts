/**
 * Contract endpoint definitions — Part 2 (events, registrations, notifications, checkin).
 * First draft by Part 1. Part 2 owns and refines.
 * Until Part 2 lands, all these return 501 NOT_IMPLEMENTED.
 */
import { z } from 'zod';
import type { EndpointDef } from './index.js';
import {
  EventCardDTOSchema, EventDetailDTOSchema, CreateEventBodySchema, UpdateEventBodySchema,
  VenueCheckBodySchema, VenueCheckResponseSchema, EventFeedQuerySchema, SeatMapDTOSchema,
  SetParticipationBodySchema,
} from '../dto/events.js';
import {
  RegistrationDTOSchema, RegisterForEventBodySchema, RegisterOutcomeSchema,
  ClashDTOSchema, SwapBodySchema, ConfirmPromotionBodySchema, PassDTOSchema,
  CheckinBodySchema, CheckinResponseSchema, AttendeeRowDTOSchema, ScheduleQuerySchema,
} from '../dto/registrations.js';
import {
  NotificationDTOSchema, UnreadCountResponseSchema,
} from '../dto/notifications.js';

export const p2Endpoints = {
  'events.feed': {
    id: 'events.feed', method: 'GET', path: '/api/events/feed', access: 'auth', part: 2,
    query: EventFeedQuerySchema,
    response: z.object({ items: z.array(EventCardDTOSchema), nextCursor: z.string().nullable() }),
  },
  'events.get': {
    id: 'events.get', method: 'GET', path: '/api/events/:eventId', access: 'auth', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    response: EventDetailDTOSchema,
  },
  'events.seats': {
    id: 'events.seats', method: 'GET', path: '/api/events/:eventId/seats', access: 'auth', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    response: SeatMapDTOSchema,
  },
  'events.create': {
    id: 'events.create', method: 'POST', path: '/api/events', access: 'organizer', part: 2,
    body: CreateEventBodySchema,
    response: EventCardDTOSchema,
  },
  'events.update': {
    id: 'events.update', method: 'PATCH', path: '/api/events/:eventId', access: 'organizer', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    body: UpdateEventBodySchema,
    response: EventCardDTOSchema,
  },
  'events.cancel': {
    id: 'events.cancel', method: 'POST', path: '/api/events/:eventId/cancel', access: 'organizer', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    response: z.object({ message: z.string() }),
  },
  'events.venueCheck': {
    id: 'events.venueCheck', method: 'POST', path: '/api/events/venue-check', access: 'organizer', part: 2,
    body: VenueCheckBodySchema,
    response: VenueCheckResponseSchema,
  },
  'events.listMine': {
    id: 'events.listMine', method: 'GET', path: '/api/organizer/events', access: 'organizer', part: 2,
    response: z.object({ items: z.array(EventCardDTOSchema), nextCursor: z.string().nullable() }),
  },
  'events.attendees': {
    id: 'events.attendees', method: 'GET', path: '/api/events/:eventId/attendees', access: 'organizer', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    response: z.object({ items: z.array(AttendeeRowDTOSchema) }),
  },
  'events.waitlist': {
    id: 'events.waitlist', method: 'GET', path: '/api/events/:eventId/waitlist', access: 'organizer', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    response: z.object({ items: z.array(AttendeeRowDTOSchema) }),
  },
  'events.setParticipation': {
    id: 'events.setParticipation', method: 'POST',
    path: '/api/events/:eventId/registrations/:registrationId/participation',
    access: 'organizer', part: 2,
    params: z.object({ eventId: z.string().uuid(), registrationId: z.string().uuid() }),
    body: SetParticipationBodySchema,
    response: z.object({ message: z.string() }),
  },
  'registrations.register': {
    id: 'registrations.register', method: 'POST', path: '/api/events/:eventId/register', access: 'student', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    body: RegisterForEventBodySchema,
    response: RegisterOutcomeSchema,
  },
  'registrations.swap': {
    id: 'registrations.swap', method: 'POST', path: '/api/events/:eventId/swap', access: 'student', part: 2,
    params: z.object({ eventId: z.string().uuid() }),
    body: SwapBodySchema,
    response: RegisterOutcomeSchema,
  },
  'registrations.cancel': {
    id: 'registrations.cancel', method: 'POST', path: '/api/registrations/:registrationId/cancel', access: 'student', part: 2,
    params: z.object({ registrationId: z.string().uuid() }),
    response: z.object({ message: z.string() }),
  },
  'registrations.confirm': {
    id: 'registrations.confirm', method: 'POST', path: '/api/registrations/:registrationId/confirm', access: 'student', part: 2,
    params: z.object({ registrationId: z.string().uuid() }),
    body: ConfirmPromotionBodySchema,
    response: z.object({ message: z.string() }),
  },
  'registrations.decline': {
    id: 'registrations.decline', method: 'POST', path: '/api/registrations/:registrationId/decline', access: 'student', part: 2,
    params: z.object({ registrationId: z.string().uuid() }),
    response: z.object({ message: z.string() }),
  },
  'registrations.mine': {
    id: 'registrations.mine', method: 'GET', path: '/api/me/registrations', access: 'auth', part: 2,
    response: z.object({ items: z.array(RegistrationDTOSchema), nextCursor: z.string().nullable() }),
  },
  'registrations.schedule': {
    id: 'registrations.schedule', method: 'GET', path: '/api/me/schedule', access: 'auth', part: 2,
    query: ScheduleQuerySchema,
    response: z.object({ items: z.array(RegistrationDTOSchema) }),
  },
  'registrations.scheduleIcs': {
    id: 'registrations.scheduleIcs', method: 'GET', path: '/api/me/schedule.ics', access: 'auth', part: 2,
    raw: 'ics' as const,
    response: z.string(),
  },
  'registrations.pass': {
    id: 'registrations.pass', method: 'GET', path: '/api/registrations/:registrationId/pass', access: 'auth', part: 2,
    params: z.object({ registrationId: z.string().uuid() }),
    response: PassDTOSchema,
  },
  'checkin.scan': {
    id: 'checkin.scan', method: 'POST', path: '/api/checkin/scan', access: 'organizer', part: 2,
    body: CheckinBodySchema,
    response: CheckinResponseSchema,
  },
  'notifications.list': {
    id: 'notifications.list', method: 'GET', path: '/api/notifications', access: 'auth', part: 2,
    query: z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(20) }),
    response: z.object({ items: z.array(NotificationDTOSchema), nextCursor: z.string().nullable() }),
  },
  'notifications.unreadCount': {
    id: 'notifications.unreadCount', method: 'GET', path: '/api/notifications/unread-count', access: 'auth', part: 2,
    response: UnreadCountResponseSchema,
  },
  'notifications.markRead': {
    id: 'notifications.markRead', method: 'POST', path: '/api/notifications/:id/read', access: 'auth', part: 2,
    params: z.object({ id: z.string().uuid() }),
    response: z.object({ message: z.string() }),
  },
  'notifications.markAllRead': {
    id: 'notifications.markAllRead', method: 'POST', path: '/api/notifications/read-all', access: 'auth', part: 2,
    response: z.object({ message: z.string() }),
  },
} as const satisfies Record<string, EndpointDef>;
