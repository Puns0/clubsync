// ─── Mock Mutable State ───
// Holds in-memory data for the mock API to query and mutate.
// Seeds from data.ts on initialization.

import {
  clubs as seedClubs,
  events as seedEvents,
  students as seedStudents,
  initialRegistrations,
  initialNotifications,
  defaultStudent,
} from "./data";
import type {
  ClubEvent,
  Registration,
  Notification,
  User,
} from "../types";
import { hasClash } from "../../lib/time";

// Internal waitlist entry type for mock state
interface MockWaitlistEntry {
  userId: string;
  registrationId: string;
  position: number;
  joinedAt: string;
}

export const state = {
  clubs: [...seedClubs],
  events: [...seedEvents],
  students: [...seedStudents],
  registrations: [...initialRegistrations] as Registration[],
  notifications: [...initialNotifications] as Notification[],
  currentUser: { ...defaultStudent },
  waitlists: new Map<string, MockWaitlistEntry[]>(),

  // ─── Queries ───
  
  getEvent(id: string): ClubEvent | undefined {
    return this.events.find((e) => e.id === id);
  },

  getUserRegistrations(userId: string): Registration[] {
    return this.registrations.filter((r) => r.userId === userId);
  },

  getWaitlist(eventId: string): MockWaitlistEntry[] {
    return this.waitlists.get(eventId) || [];
  },

  // ─── Mutations ───

  addRegistration(registration: Registration) {
    this.registrations.push(registration);
    
    // Update event seat count
    if (registration.status === "confirmed") {
      const event = this.getEvent(registration.eventId);
      if (event) {
        event.taken += 1;
      }
    }
  },

  updateRegistrationStatus(id: string, status: Registration["status"]) {
    const reg = this.registrations.find((r) => r.id === id);
    if (!reg) return;
    
    const oldStatus = reg.status;
    reg.status = status;

    // Adjust seat counts if moving in/out of confirmed status
    const event = this.getEvent(reg.eventId);
    if (event) {
      if (status === "confirmed" && oldStatus !== "confirmed") {
         event.taken += 1;
      } else if (oldStatus === "confirmed" && status !== "confirmed") {
         event.taken -= 1;
      }
    }
  },

  addToWaitlist(eventId: string, entry: MockWaitlistEntry) {
    if (!this.waitlists.has(eventId)) {
      this.waitlists.set(eventId, []);
    }
    this.waitlists.get(eventId)!.push(entry);
  },

  removeFromWaitlist(eventId: string, userId: string) {
    const list = this.waitlists.get(eventId);
    if (!list) return;
    this.waitlists.set(
      eventId,
      list.filter((entry) => entry.userId !== userId)
    );
  },

  addNotification(notification: Notification) {
    this.notifications.unshift(notification);
  },

  markNotificationRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.readAt = new Date().toISOString();
  },

  markAllNotificationsRead(userId: string) {
     const now = new Date().toISOString();
     this.notifications.forEach(n => {
       if (n.userId === userId && !n.readAt) {
         n.readAt = now;
       }
     });
  },

  // ─── Domain Logic ───

  checkClashes(userId: string, targetEvent: ClubEvent): ClubEvent[] {
    const userRegs = this.getUserRegistrations(userId);
    const confirmedEvents = userRegs
      .filter((r) => r.status === "confirmed" || r.status === "promoted_pending")
      .map((r) => this.getEvent(r.eventId))
      .filter((e): e is ClubEvent => e !== undefined);

    return confirmedEvents.filter((e) =>
      hasClash(targetEvent.startsAt, targetEvent.endsAt, e.startsAt, e.endsAt)
    );
  },

  reset() {
    this.events = JSON.parse(JSON.stringify(seedEvents));
    this.registrations = [...initialRegistrations];
    this.notifications = [...initialNotifications];
    this.waitlists.clear();
  }
};
