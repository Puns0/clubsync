/**
 * Planning DTOs (timetable, slot finder, letters) — first draft by Part 1.
 * Part 4 owns this file and may refine schemas (additive only).
 */
import { z } from 'zod';

export const TimetableSlotDTOSchema = z.object({
  id: z.string().uuid(),
  department: z.string(),
  semester: z.number(),
  section: z.string(),
  dayOfWeek: z.number().int().min(1).max(7),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(0).max(1439),
  subject: z.string(),
  room: z.string().nullable(),
});

export const TimetableUpsertBodySchema = z.object({
  slots: z.array(z.object({
    department: z.string(),
    semester: z.number(),
    section: z.string(),
    dayOfWeek: z.number().int().min(1).max(7),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(0).max(1439),
    subject: z.string(),
    room: z.string().nullable().optional(),
  })),
});

export const AcademicCalendarEntryDTOSchema = z.object({
  id: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(['EXAM', 'HOLIDAY']),
  label: z.string(),
});

export const CalendarUpsertBodySchema = z.object({
  entries: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    type: z.enum(['EXAM', 'HOLIDAY']),
    label: z.string(),
  })),
});

export const SlotSuggestBodySchema = z.object({
  eligibleYears: z.array(z.number().int().min(1).max(4)),
  eligibleDepartments: z.array(z.string()),
  durationMinutes: z.number().int().min(15).max(480),
  venueId: z.string().uuid().optional(),
});

export const SlotSuggestionDTOSchema = z.object({
  day: z.number().int().min(1).max(7),
  startMinute: z.number(),
  endMinute: z.number(),
  score: z.number(),
  label: z.string(),
  conflicts: z.number(),
  venueAvailable: z.boolean(),
});

export const OrganizerDashboardDTOSchema = z.object({
  clubs: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    upcomingEventCount: z.number(),
    totalRegistrations: z.number(),
  })),
  recentEvents: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    startsAt: z.string(),
    confirmedCount: z.number(),
    capacity: z.number(),
  })),
});
