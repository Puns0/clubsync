/** All Socket.io event names used across the app. */
export const SOCKET_EVENTS = {
  // client → server
  JOIN_EVENT: 'room:join-event',
  LEAVE_EVENT: 'room:leave-event',

  // server → client
  SEATS_UPDATED: 'seats:updated',
  WAITLIST_UPDATED: 'waitlist:updated',
  EVENT_UPDATED: 'event:updated',
  REGISTRATION_UPDATED: 'registration:updated',
  PROMOTION_OFFERED: 'promotion:offered',
  NOTIFICATION_NEW: 'notification:new',
  CHECKIN_SCANNED: 'checkin:scanned',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ── Payload types for each event ─────────────────────────────────

export interface SeatsUpdatedPayload {
  eventId: string;
  capacity: number;
  confirmed: number;
  pending: number;
  waitlist: number;
}

export interface WaitlistUpdatedPayload {
  eventId: string;
  count: number;
}

export interface EventUpdatedPayload {
  eventId: string;
}

export interface PromotionOfferedPayload {
  registrationId: string;
  eventId: string;
  expiresAt: string;
  clashWith?: { eventId: string; title: string } | null;
}

export interface CheckinScannedPayload {
  eventId: string;
  registrationId: string;
  result: 'OK' | 'INVALID' | 'ALREADY_USED' | 'WRONG_EVENT';
}

/** Socket rooms naming conventions. */
export const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  event: (eventId: string) => `event:${eventId}`,
  club: (clubId: string) => `club:${clubId}`,
} as const;
