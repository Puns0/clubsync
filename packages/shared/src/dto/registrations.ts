/**
 * Registration DTOs — first draft by Part 1.
 * Part 2 owns this file and may refine schemas (additive only).
 */
import { z } from 'zod';
import { EventCardDTOSchema } from './events.js';

export const RegistrationDTOSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(['CONFIRMED', 'WAITLISTED', 'PROMOTED_PENDING', 'CANCELLED', 'ATTENDED', 'NO_SHOW']),
  waitlistPosition: z.number().nullable(),
  isPreferred: z.boolean(),
  promotedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  attendedAt: z.string().nullable(),
  event: EventCardDTOSchema.optional(),
  clashWith: EventCardDTOSchema.nullable().optional(),
});
export type RegistrationDTO = z.infer<typeof RegistrationDTOSchema>;

export const RegisterForEventBodySchema = z.object({
  preferred: z.boolean().default(false),
});

export const RegisterOutcomeSchema = z.object({
  outcome: z.enum(['CONFIRMED', 'WAITLISTED']),
  registration: RegistrationDTOSchema,
});

export const ClashDTOSchema = z.object({
  conflicting: EventCardDTOSchema,
  registrationId: z.string().uuid(),
  suggestions: z.array(z.object({
    kind: z.enum(['SWAP', 'JOIN_WAITLIST', 'OTHER_EVENT']),
    message: z.string(),
    eventId: z.string().uuid(),
    releaseRegistrationId: z.string().uuid().optional(),
  })),
});
export type ClashDTO = z.infer<typeof ClashDTOSchema>;

export const SwapBodySchema = z.object({
  releaseRegistrationId: z.string().uuid(),
});

export const ConfirmPromotionBodySchema = z.object({
  releaseRegistrationId: z.string().uuid().optional(),
});

export const PassDTOSchema = z.object({
  qrDataUrl: z.string(),
  registration: RegistrationDTOSchema,
});

export const CheckinBodySchema = z.object({
  token: z.string().min(1),
});

export const CheckinResponseSchema = z.object({
  result: z.enum(['OK', 'INVALID', 'ALREADY_USED', 'WRONG_EVENT']),
  registrationId: z.string().uuid().optional(),
  studentName: z.string().optional(),
});

export const AttendeeRowDTOSchema = z.object({
  registrationId: z.string().uuid(),
  status: z.enum(['CONFIRMED', 'WAITLISTED', 'PROMOTED_PENDING', 'CANCELLED', 'ATTENDED', 'NO_SHOW']),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  year: z.number(),
  usn: z.string(),
  phone: z.string(),
  waLink: z.string(),
  checkedInAt: z.string().nullable(),
});
export type AttendeeRowDTO = z.infer<typeof AttendeeRowDTOSchema>;

export const ScheduleQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
