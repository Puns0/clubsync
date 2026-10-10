// ─── Mock API Handlers ───
// Implements the business logic of the backend.

import { state } from "./state";
import { mockSocket } from "./socket";
import type { Registration, WaitlistEntry, Notification } from "../types";

// Helper to simulate network delay
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

function ok<T>(data: T) {
  return { data };
}

function error(message: string, code = "BAD_REQUEST", status = 400): never {
  throw {
    response: {
      status,
      json: () => Promise.resolve({ error: { message, code } }),
    },
  };
}

function makeRegistration(
  eventId: string,
  status: Registration["status"],
  extra: Partial<Registration> = {}
): Registration {
  return {
    id: `reg-${Date.now()}`,
    userId: state.currentUser.id,
    eventId,
    status,
    waitlistPosition: null,
    promotedAt: null,
    expiresAt: null,
    qrToken: status === "confirmed" ? `qr-${Date.now()}` : null,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

export const handlers = {
  // ─── Auth ───

  async me() {
    await delay(300);
    return ok({ user: state.currentUser });
  },

  async login(body: any) {
    await delay(600);
    if (body.email === "puneet.g@sjbit.edu.in" && body.password === "password") {
      return ok({ user: state.currentUser });
    }
    error("Invalid email or password", "UNAUTHORIZED", 401);
  },

  async logout() {
    await delay(200);
    return ok({ success: true });
  },

  // ─── Discovery ───

  async getEvents(params?: any) {
    await delay(300);
    let events = state.events;
    if (params?.club) {
      events = events.filter((e) => e.clubId === params.club);
    }
    if (params?.section === "live") {
       events = events.filter(e => e.status === "live");
    } else if (params?.section === "upcoming") {
       events = events.filter(e => e.status === "upcoming");
    }
    return ok({ events });
  },

  async getEvent(id: string) {
    await delay(200);
    const event = state.getEvent(id);
    if (!event) error("Event not found", "NOT_FOUND", 404);
    return ok({ event });
  },

  async getClubs() {
    await delay(300);
    return ok({ clubs: state.clubs });
  },

  async getClub(id: string) {
    await delay(200);
    const club = state.clubs.find(c => c.id === id);
    if (!club) error("Club not found", "NOT_FOUND", 404);
    return ok({ club });
  },

  // ─── Registration ───

  async getMyRegistrations() {
    await delay(400);
    return ok({ registrations: state.getUserRegistrations(state.currentUser.id) });
  },

  async register(eventId: string) {
    await delay(500);
    const event = state.getEvent(eventId);
    if (!event) error("Event not found", "NOT_FOUND", 404);

    // Already registered?
    const existing = state.getUserRegistrations(state.currentUser.id)
      .find(r => r.eventId === eventId && r.status !== "cancelled");
    if (existing) {
      error("Already registered for this event", "already_registered");
    }

    // Eligibility Check
    if (event.eligibleDepartments && !event.eligibleDepartments.includes(state.currentUser.department)) {
      error("Your department is not eligible for this event", "not_eligible");
    }
    if (event.eligibleYears && !event.eligibleYears.includes(state.currentUser.year)) {
      error("Your year is not eligible for this event", "not_eligible");
    }

    // Clash Check
    const clashes = state.checkClashes(state.currentUser.id, event);
    if (clashes.length > 0) {
      error(
        `This event clashes with "${clashes[0].title}" (${clashes[0].clubName})`,
        "CLASH",
        409
      );
    }

    // Capacity Check
    if (event.taken >= event.capacity) {
      error("Event is full", "full", 409);
    }

    // Success
    const reg = makeRegistration(eventId, "confirmed");
    state.addRegistration(reg);

    // Emit socket event
    mockSocket.serverEmit("seat:updated", {
       eventId,
       taken: event.taken,
       capacity: event.capacity
    });

    // Add notification
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      userId: state.currentUser.id,
      type: "registration_confirmed",
      title: "Registration Confirmed",
      body: `You're registered for "${event.title}". Check your passes.`,
      eventId,
      registrationId: reg.id,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    state.addNotification(notif);

    return ok({ registration: reg, message: "Registration confirmed!" });
  },

  async joinWaitlist(eventId: string) {
    await delay(500);
    const event = state.getEvent(eventId);
    if (!event) error("Event not found", "NOT_FOUND", 404);

    const waitlist = state.getWaitlist(eventId);
    const position = waitlist.length + 1;

    const reg = makeRegistration(eventId, "waitlisted", {
      waitlistPosition: position,
    });
    state.addRegistration(reg);

    state.addToWaitlist(eventId, {
      userId: state.currentUser.id,
      registrationId: reg.id,
      position,
      joinedAt: reg.createdAt,
    });

    mockSocket.serverEmit("waitlist:moved", {
       eventId,
       registrationId: reg.id,
       position,
    });

    return ok({ registration: reg, position });
  },

  async getWaitlist(eventId: string) {
     await delay(200);
     const rawList = state.getWaitlist(eventId);
     // Map to the API WaitlistEntry shape
     const entries: WaitlistEntry[] = rawList.map(entry => ({
       position: entry.position,
       registrationId: entry.registrationId,
       isCurrentUser: entry.userId === state.currentUser.id,
       createdAt: entry.joinedAt,
     }));
     return ok({ waitlist: entries });
  },

  async cancelRegistration(eventId: string) {
    await delay(400);
    const regs = state.getUserRegistrations(state.currentUser.id);
    const reg = regs.find(r => r.eventId === eventId && r.status !== "cancelled");
    if (!reg) error("Registration not found", "NOT_FOUND", 404);

    const oldStatus = reg.status;
    state.updateRegistrationStatus(reg.id, "cancelled");

    if (oldStatus === "confirmed") {
        const event = state.getEvent(eventId)!;
        mockSocket.serverEmit("seat:updated", {
           eventId,
           taken: event.taken,
           capacity: event.capacity
        });
    } else if (oldStatus === "waitlisted") {
        state.removeFromWaitlist(eventId, state.currentUser.id);
        const list = state.getWaitlist(eventId);
        list.forEach((entry, i) => entry.position = i + 1);
    }

    return ok({ success: true });
  },

  // ─── Promotion ───

  async confirmPromotion(registrationId: string) {
     await delay(500);
     const regs = state.getUserRegistrations(state.currentUser.id);
     const reg = regs.find(r => r.id === registrationId);
     if (!reg || reg.status !== "promoted_pending") {
         error("Invalid promotion state", "BAD_REQUEST");
     }
     state.updateRegistrationStatus(registrationId, "confirmed");
     reg.qrToken = `qr-${Date.now()}`;
     return ok({ registration: reg });
  },

  async passPromotion(registrationId: string) {
     await delay(400);
     const regs = state.getUserRegistrations(state.currentUser.id);
     const reg = regs.find(r => r.id === registrationId);
     if (!reg || reg.status !== "promoted_pending") {
         error("Invalid promotion state", "BAD_REQUEST");
     }
     state.updateRegistrationStatus(registrationId, "cancelled");
     return ok({ registration: reg });
  },

  // ─── Notifications ───
  
  async getNotifications() {
     await delay(200);
     return ok({ notifications: state.notifications.filter(n => n.userId === state.currentUser.id) });
  },

  async readNotification(id: string) {
     await delay(100);
     state.markNotificationRead(id);
     return ok({ success: true });
  },

  async readAllNotifications() {
     await delay(200);
     state.markAllNotificationsRead(state.currentUser.id);
     return ok({ success: true });
  }
};
