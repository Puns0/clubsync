// ── Roles ────────────────────────────────────────────────────────
export const Role = {
  STUDENT: 'STUDENT',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

// ── Organizer approval status ────────────────────────────────────
export const OrganizerStatus = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type OrganizerStatus = (typeof OrganizerStatus)[keyof typeof OrganizerStatus];

// ── Event lifecycle ──────────────────────────────────────────────
export const EventStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

/** Derived from time, not stored. */
export const EventPhase = {
  LIVE: 'LIVE',
  TODAY: 'TODAY',
  UPCOMING: 'UPCOMING',
  PAST: 'PAST',
} as const;
export type EventPhase = (typeof EventPhase)[keyof typeof EventPhase];

// ── Registration lifecycle ───────────────────────────────────────
export const RegistrationStatus = {
  CONFIRMED: 'CONFIRMED',
  WAITLISTED: 'WAITLISTED',
  PROMOTED_PENDING: 'PROMOTED_PENDING',
  CANCELLED: 'CANCELLED',
  ATTENDED: 'ATTENDED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const CancelReason = {
  USER: 'USER',
  EXPIRED: 'EXPIRED',
  DECLINED: 'DECLINED',
  ORGANIZER: 'ORGANIZER',
  SWAPPED: 'SWAPPED',
  RELEASED_FOR_PREFERRED: 'RELEASED_FOR_PREFERRED',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
} as const;
export type CancelReason = (typeof CancelReason)[keyof typeof CancelReason];

// ── Notifications ────────────────────────────────────────────────
export const NotificationType = {
  SEAT_CONFIRMED: 'SEAT_CONFIRMED',
  WAITLISTED: 'WAITLISTED',
  PROMOTED: 'PROMOTED',
  PROMOTION_EXPIRED: 'PROMOTION_EXPIRED',
  SEAT_RELEASED: 'SEAT_RELEASED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  CLASH_WARNING: 'CLASH_WARNING',
  REMINDER: 'REMINDER',
  CHECKED_IN: 'CHECKED_IN',
  ORGANIZER_APPROVED: 'ORGANIZER_APPROVED',
  ORGANIZER_REJECTED: 'ORGANIZER_REJECTED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ── OTP ──────────────────────────────────────────────────────────
export const OtpPurpose = {
  VERIFY_EMAIL: 'VERIFY_EMAIL',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

// ── Calendar ─────────────────────────────────────────────────────
export const CalendarEntryType = {
  EXAM: 'EXAM',
  HOLIDAY: 'HOLIDAY',
} as const;
export type CalendarEntryType = (typeof CalendarEntryType)[keyof typeof CalendarEntryType];
