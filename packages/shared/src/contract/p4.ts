/**
 * Contract endpoint definitions — Part 4 (organizer dashboard, timetable, slot finder, letters, analytics).
 * First draft by Part 1. Part 4 owns and refines.
 * Until Part 4 lands, all these return 501 NOT_IMPLEMENTED.
 */
import { z } from 'zod';
import type { EndpointDef } from './index.js';
import {
  TimetableSlotDTOSchema, TimetableUpsertBodySchema,
  AcademicCalendarEntryDTOSchema, CalendarUpsertBodySchema,
  SlotSuggestBodySchema, SlotSuggestionDTOSchema,
  OrganizerDashboardDTOSchema,
} from '../dto/planning.js';

export const p4Endpoints = {
  'organizer.dashboard': {
    id: 'organizer.dashboard', method: 'GET', path: '/api/organizer/dashboard', access: 'organizer', part: 4,
    response: OrganizerDashboardDTOSchema,
  },
  'timetable.get': {
    id: 'timetable.get', method: 'GET', path: '/api/admin/timetable', access: 'admin', part: 4,
    response: z.object({ items: z.array(TimetableSlotDTOSchema) }),
  },
  'timetable.upsert': {
    id: 'timetable.upsert', method: 'PUT', path: '/api/admin/timetable', access: 'admin', part: 4,
    body: TimetableUpsertBodySchema,
    response: z.object({ count: z.number() }),
  },
  'calendar.list': {
    id: 'calendar.list', method: 'GET', path: '/api/admin/academic-calendar', access: 'admin', part: 4,
    response: z.object({ items: z.array(AcademicCalendarEntryDTOSchema) }),
  },
  'calendar.upsert': {
    id: 'calendar.upsert', method: 'PUT', path: '/api/admin/academic-calendar', access: 'admin', part: 4,
    body: CalendarUpsertBodySchema,
    response: z.object({ count: z.number() }),
  },
  'slotfinder.suggest': {
    id: 'slotfinder.suggest', method: 'POST', path: '/api/slot-finder/suggest', access: 'organizer', part: 4,
    body: SlotSuggestBodySchema,
    response: z.object({ items: z.array(SlotSuggestionDTOSchema) }),
  },
  'letters.generate': {
    id: 'letters.generate', method: 'POST', path: '/api/events/:eventId/letter', access: 'organizer', part: 4,
    params: z.object({ eventId: z.string().uuid() }),
    raw: 'pdf' as const,
    response: z.string(),
  },
  'events.scan': {
    id: 'events.scan', method: 'POST', path: '/api/events/:eventId/scan', access: 'organizerOrAdmin', part: 4,
    params: z.object({ eventId: z.string().uuid() }),
    body: z.object({ token: z.string() }),
    response: z.object({ success: z.boolean(), message: z.string() }),
  },
  'analytics.club': {
    id: 'analytics.club', method: 'GET', path: '/api/analytics/clubs/:clubId', access: 'organizer', part: 4,
    params: z.object({ clubId: z.string().uuid() }),
    response: z.object({ fillRate: z.number(), noShowRate: z.number() }),
  },
} as const satisfies Record<string, EndpointDef>;
