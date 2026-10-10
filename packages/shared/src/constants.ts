/** Departments offered (editable). */
export const DEPARTMENTS = ['CSE', 'ISE', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** Valid student years. */
export const YEARS = [1, 2, 3, 4] as const;
export type Year = (typeof YEARS)[number];

/** Uppercase USN pattern: e.g. 1SJ21CS001 */
export const USN_REGEX = /^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$/;

/** Indian mobile stored as +91XXXXXXXXXX. */
export const PHONE_REGEX = /^\+91[6-9]\d{9}$/;

/** Map a year to its two possible semesters. */
export function semestersForYear(year: number): [number, number] {
  return [2 * year - 1, 2 * year];
}

/** Default app timezone for display. */
export const APP_TIMEZONE = 'Asia/Kolkata';

/** Pagination defaults. */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/** Password constraints. */
export const PASSWORD_RULES = {
  MIN_LENGTH: 10,
  /** Must contain at least one letter. */
  HAS_LETTER: /[a-zA-Z]/,
  /** Must contain at least one number. */
  HAS_NUMBER: /\d/,
} as const;

/** OTP configuration. */
export const OTP_RULES = {
  LENGTH: 6,
  TTL_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_RESENDS_PER_HOUR: 5,
} as const;

/** Login lockout. */
export const LOGIN_LOCKOUT = {
  MAX_FAILURES: 5,
  LOCKOUT_MINUTES: 15,
} as const;

/** Session lifetimes. */
export const SESSION = {
  SLIDING_DAYS: 7,
  ABSOLUTE_CAP_DAYS: 30,
} as const;

/** Default settings (stored in Setting table). */
export const DEFAULT_SETTINGS = {
  demoMode: false,
  confirmWindowMinutes: 30,
  demoConfirmWindowSeconds: 60,
  cancelCutoffMinutes: 120,
} as const;
