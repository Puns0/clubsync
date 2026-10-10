// ─── API Types ───
// TODO: replace with @clubsync/shared when the shared package exists.
// These types define the contract between frontend and backend.

// ─── User / Auth ───

export interface User {
  id: string;
  name: string;
  email: string;
  usn: string;
  department: string;
  year: number;
  phone: string;
  role: "student" | "organizer" | "admin";
  emailVerifiedAt: string | null;
}

export interface SignupPayload {
  name: string;
  email: string;
  usn: string;
  department: string;
  year: number;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

// ─── Club ───

export interface Club {
  id: string;
  name: string;
  description: string;
}

// ─── Venue ───

export interface Venue {
  id: string;
  name: string;
}

// ─── Event ───

export type EventStatus = "upcoming" | "live" | "ended" | "cancelled";

export interface ClubEvent {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string; // ISO 8601 UTC
  endsAt: string; // ISO 8601 UTC
  capacity: number;
  taken: number;
  eligibleYears: number[] | null; // null = all years
  eligibleDepartments: string[] | null; // null = all departments
  status: EventStatus;
}

export type EventSection = "live" | "today" | "upcoming";

export interface EventsQuery {
  section?: EventSection;
  club?: string;
  q?: string;
}

// ─── Registration ───

export type RegistrationStatus =
  | "confirmed"
  | "waitlisted"
  | "promoted_pending"
  | "cancelled"
  | "attended"
  | "no_show";

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  waitlistPosition: number | null;
  promotedAt: string | null;
  expiresAt: string | null;
  qrToken: string | null;
  createdAt: string;
  // Denormalized event info for convenience
  event?: ClubEvent;
}

export interface RegisterResult {
  registration: Registration;
  message: string;
}

export interface ClashInfo {
  clashingRegistration: Registration;
  clashingEvent: ClubEvent;
  swapSuggestions: SwapSuggestion[];
}

export interface SwapSuggestion {
  event: ClubEvent;
  action: "swap" | "waitlist";
  label: string;
}

export interface RegistrationError {
  type: "clash" | "not_eligible" | "full" | "already_registered" | "race" | "closed";
  message: string;
  clash?: ClashInfo;
  eligibilityReason?: string;
}

// ─── Waitlist ───

export interface WaitlistEntry {
  position: number;
  registrationId: string;
  isCurrentUser: boolean;
  createdAt: string;
}

// ─── Pass ───

export interface Pass {
  id: string;
  registrationId: string;
  eventId: string;
  event: ClubEvent;
  studentName: string;
  qrToken: string;
  serial: string;
  status: "valid" | "used" | "event_ended" | "no_show";
}

// ─── Notification ───

export type NotificationType =
  | "promotion_offered"
  | "promotion_expired"
  | "waitlist_moved"
  | "registration_confirmed"
  | "event_reminder"
  | "general";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  eventId?: string;
  registrationId?: string;
  readAt: string | null;
  createdAt: string;
}

// ─── Socket Events ───

export interface SeatUpdatedPayload {
  eventId: string;
  taken: number;
  capacity: number;
}

export interface WaitlistMovedPayload {
  eventId: string;
  registrationId: string;
  position: number;
}

export interface PromotionOfferedPayload {
  registrationId: string;
  eventId: string;
  promotedAt: string;
  expiresAt: string;
  releasesRegistrationId?: string;
}

export interface PromotionExpiredPayload {
  registrationId: string;
  eventId: string;
}

// ─── API Response Wrappers ───

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    type: string;
    message: string;
    fields?: Record<string, string>;
    retryAfter?: number; // seconds, for 429
    clash?: ClashInfo;
    eligibilityReason?: string;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return "error" in result;
}
