// ─── API Endpoints ───
// ASSUMED: replace with agreed route list from Step 0.
// All routes defined in one place so swapping to the real API is a one-file change.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const endpoints = {
  // Auth
  signup: `${BASE}/auth/signup`,
  verifyOtp: `${BASE}/auth/verify-otp`,
  resendOtp: `${BASE}/auth/resend-otp`,
  login: `${BASE}/auth/login`,
  logout: `${BASE}/auth/logout`,
  forgotPassword: `${BASE}/auth/forgot-password`,
  resetPassword: `${BASE}/auth/reset-password`,
  me: `${BASE}/auth/me`,
  csrf: `${BASE}/auth/csrf`,

  // Discovery
  events: `${BASE}/events`,
  event: (id: string) => `${BASE}/events/${id}`,
  clubs: `${BASE}/clubs`,
  club: (id: string) => `${BASE}/clubs/${id}`,

  // Registration
  register: (eventId: string) => `${BASE}/events/${eventId}/register`,
  joinWaitlist: (eventId: string) => `${BASE}/events/${eventId}/waitlist`,
  cancelRegistration: (eventId: string) =>
    `${BASE}/events/${eventId}/registration`,
  eventWaitlist: (eventId: string) => `${BASE}/events/${eventId}/waitlist`,

  // Promotion
  confirmPromotion: (registrationId: string) =>
    `${BASE}/registrations/${registrationId}/confirm`,
  passPromotion: (registrationId: string) =>
    `${BASE}/registrations/${registrationId}/pass`,

  // Me
  myRegistrations: `${BASE}/me/registrations`,
  myPasses: `${BASE}/me/passes`,

  // Notifications
  notifications: `${BASE}/notifications`,
  readNotification: (id: string) => `${BASE}/notifications/${id}/read`,
  readAllNotifications: `${BASE}/notifications/read-all`,
} as const;

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
