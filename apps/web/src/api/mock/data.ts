// ─── Mock Data ───
// Realistic Indian college context. No lorem ipsum.
// Covers all demo scenarios: 2-seat event, clash pair, back-to-back pair,
// restricted events, full events, live events.

import type {
  Club,
  ClubEvent,
  User,
  Registration,
  Notification,
  Pass,
  WaitlistEntry,
} from "../types";

// ─── Helpers ───

function isoDate(year: number, month: number, day: number, hour: number, minute = 0): string {
  // Create in IST (UTC+5:30), store as UTC ISO string
  const d = new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30));
  return d.toISOString();
}

// Use current date context for realistic data
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const todayStr = (h: number, m = 0) => {
  const d = new Date(Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    h - 5, m - 30
  ));
  return d.toISOString();
};
const tomorrowStr = (h: number, m = 0) => {
  const d = new Date(Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
    h - 5, m - 30
  ));
  return d.toISOString();
};
const dayAfterStr = (h: number, m = 0) => {
  const d = new Date(Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 2,
    h - 5, m - 30
  ));
  return d.toISOString();
};

// ─── Clubs ───

export const clubs: Club[] = [
  { id: "club-1", name: "CodeCraft", description: "The coding and competitive programming club. Weekly contests, workshops, and hackathon prep sessions for students who love to build." },
  { id: "club-2", name: "RoboVerse", description: "Robotics and embedded systems club. From line followers to autonomous drones — we build machines that move." },
  { id: "club-3", name: "Nritya", description: "The dance crew of SJBIT. Classical, contemporary, and street — we perform at every fest and compete state-wide." },
  { id: "club-4", name: "Sargam", description: "Music club covering vocals, instruments, and production. Open mics, jam sessions, and the annual Battle of Bands." },
  { id: "club-5", name: "FrameShift", description: "Photography and visual storytelling. Photowalks, editing workshops, and an annual exhibition." },
  { id: "club-6", name: "LaunchPad", description: "Entrepreneurship and innovation cell. Pitch nights, startup mentoring, and idea incubation for student founders." },
];

// ─── Students ───

export const students: User[] = [
  { id: "stu-1", name: "Puneet Gangur", email: "puneet.g@sjbit.edu.in", usn: "1SJ22CS089", department: "CSE", year: 3, phone: "9876543210", role: "student", emailVerifiedAt: "2026-09-01T00:00:00Z" },
  { id: "stu-2", name: "Ananya Sharma", email: "ananya.s@sjbit.edu.in", usn: "1SJ23CS012", department: "CSE", year: 2, phone: "9876543211", role: "student", emailVerifiedAt: "2026-09-01T00:00:00Z" },
  { id: "stu-3", name: "Rohan Kulkarni", email: "rohan.k@sjbit.edu.in", usn: "1SJ22IS045", department: "ISE", year: 3, phone: "9876543212", role: "student", emailVerifiedAt: "2026-09-01T00:00:00Z" },
  { id: "stu-4", name: "Meera Nair", email: "meera.n@sjbit.edu.in", usn: "1SJ23EC078", department: "ECE", year: 2, phone: "9876543213", role: "student", emailVerifiedAt: "2026-09-01T00:00:00Z" },
  { id: "stu-5", name: "Vikram Reddy", email: "vikram.r@sjbit.edu.in", usn: "1SJ21CS102", department: "CSE", year: 4, phone: "9876543214", role: "student", emailVerifiedAt: "2026-09-01T00:00:00Z" },
  { id: "stu-6", name: "Priya Joshi", email: "priya.j@sjbit.edu.in", usn: "1SJ22IS033", department: "ISE", year: 3, phone: "9876543215", role: "student", emailVerifiedAt: "2026-09-01T00:00:00Z" },
];

// ─── Events ───

export const events: ClubEvent[] = [
  {
    id: "evt-1",
    clubId: "club-1",
    clubName: "CodeCraft",
    title: "Hackathon Prep Workshop",
    description: "Intensive workshop covering problem solving strategies, team coordination, and rapid prototyping. Limited seats to keep it hands-on.",
    venue: "CS Lab 201",
    startsAt: todayStr(14, 0),
    endsAt: todayStr(16, 0),
    capacity: 2,
    taken: 0,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "upcoming",
  },
  {
    id: "evt-2",
    clubId: "club-1",
    clubName: "CodeCraft",
    title: "Weekend Code Sprint",
    description: "48-hour coding marathon. Form teams of 3, pick a track, and build something real. Mentors from the industry will be available.",
    venue: "Innovation Hub",
    startsAt: tomorrowStr(9, 0),
    endsAt: dayAfterStr(9, 0),
    capacity: 10,
    taken: 7,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "upcoming",
  },
  {
    // Overlaps with evt-1 (same time slot) → used for clash demo
    id: "evt-3",
    clubId: "club-2",
    clubName: "RoboVerse",
    title: "Bot Building 101",
    description: "Beginner-friendly session on building your first line-following robot. Components provided. No prior experience needed.",
    venue: "Seminar Hall A",
    startsAt: todayStr(13, 30),
    endsAt: todayStr(15, 30),
    capacity: 20,
    taken: 14,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "upcoming",
  },
  {
    id: "evt-4",
    clubId: "club-3",
    clubName: "Nritya",
    title: "Classical Fusion Night",
    description: "An evening of Bharatanatyam meets contemporary dance. Performances by club members followed by an open floor jam.",
    venue: "Open Amphitheatre",
    startsAt: todayStr(10, 0),
    endsAt: todayStr(12, 0),
    capacity: 30,
    taken: 22,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "live",
  },
  {
    id: "evt-5",
    clubId: "club-4",
    clubName: "Sargam",
    title: "Open Mic Afternoon",
    description: "Sing, play, recite, or just vibe. Five minutes on stage, no audition needed. Sign up and show up.",
    venue: "Seminar Hall B",
    startsAt: todayStr(12, 0),
    endsAt: todayStr(14, 0),
    capacity: 15,
    taken: 15,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "live",
  },
  {
    id: "evt-6",
    clubId: "club-5",
    clubName: "FrameShift",
    title: "Street Photography Walk",
    description: "Guided walk through Jayanagar exploring street photography techniques. Bring your camera or phone. We will cover composition, light, and candid moments.",
    venue: "Meet at College Gate",
    startsAt: tomorrowStr(7, 0),
    endsAt: tomorrowStr(10, 0),
    capacity: 8,
    taken: 5,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "upcoming",
  },
  {
    // Restricted to 3rd and 4th year only
    id: "evt-7",
    clubId: "club-6",
    clubName: "LaunchPad",
    title: "Startup Pitch Night",
    description: "Present your startup idea to a panel of alumni founders and VCs. Top 3 pitches win mentorship slots and seed credits.",
    venue: "Seminar Hall A",
    startsAt: tomorrowStr(17, 0),
    endsAt: tomorrowStr(19, 30),
    capacity: 25,
    taken: 12,
    eligibleYears: [3, 4],
    eligibleDepartments: null,
    status: "upcoming",
  },
  {
    // Back-to-back with evt-5 (starts exactly when evt-5 ends) → NOT a clash
    id: "evt-8",
    clubId: "club-4",
    clubName: "Sargam",
    title: "Raga Workshop",
    description: "Introduction to Hindustani ragas. Learn the basics of Yaman and Bhairav with hands-on swar practice. Instruments available.",
    venue: "Seminar Hall B",
    startsAt: todayStr(14, 0),
    endsAt: todayStr(16, 0),
    capacity: 5,
    taken: 3,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "upcoming",
  },
  {
    // Restricted to CSE only
    id: "evt-9",
    clubId: "club-1",
    clubName: "CodeCraft",
    title: "AI Paper Reading Circle",
    description: "Weekly paper reading session. This week: Attention Is All You Need. Come prepared with the paper read, we will discuss architecture and implications.",
    venue: "CS Lab 201",
    startsAt: dayAfterStr(15, 0),
    endsAt: dayAfterStr(17, 0),
    capacity: 3,
    taken: 1,
    eligibleYears: null,
    eligibleDepartments: ["CSE"],
    status: "upcoming",
  },
  {
    id: "evt-10",
    clubId: "club-3",
    clubName: "Nritya",
    title: "Dance Auditions — Fest Team",
    description: "Auditions for the inter-college fest dance team. Prepared piece (90 seconds) followed by a freestyle round. All styles welcome.",
    venue: "Open Amphitheatre",
    startsAt: todayStr(9, 0),
    endsAt: todayStr(11, 30),
    capacity: 40,
    taken: 28,
    eligibleYears: null,
    eligibleDepartments: null,
    status: "live",
  },
];

// ─── Initial Registrations (for demo state) ───

export const initialRegistrations: Registration[] = [];

// ─── Initial Notifications ───

export const initialNotifications: Notification[] = [];

// ─── Default logged-in student ───

export const defaultStudent = students[0]; // Puneet
