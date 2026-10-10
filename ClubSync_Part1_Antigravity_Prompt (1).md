# ClubSync — PART 1 of 4 · Foundation, Design System, Auth & Admin

> **How to use:** open Antigravity on **Device 1**, switch to **Planning mode**, and paste everything below the line. Parts 2, 3 and 4 run on other devices and are integrated later on a main device. This prompt already contains the full project context, the shared contract all four parts obey, and the integration tooling you must build.

---

# 0. HOW YOU MUST WORK

You are the engineer for **Part 1 of 4** of a hackathon project called **ClubSync**. Three other AI agents on three other devices build Parts 2, 3 and 4 against the same contract. Everything is merged on one main device afterwards, so **your output must be a clean, modular foundation that others plug into without breaking anything.**

1. **Plan first.** Produce an implementation plan and task list, then execute it phase by phase (Section 10). Do not stop to ask me questions. When something is unspecified, make the most sensible choice, record it in `docs/DECISIONS.md`, and continue.
2. **Flag every deviation from this spec** (a library swapped, a field added, a rule changed) in `docs/DEVIATIONS.md` with a one-line reason. Never deviate silently.
3. **Do not change the tech stack** (Section 2.9). Only the small tooling/utility additions listed there are allowed.
4. **Do not build early.** Build only what Part 1 owns (Section 3.3). For other parts, build only the stubs and placeholders this prompt asks for.
5. **TypeScript strict everywhere.** No `any`, no `@ts-ignore` without a comment explaining why. Zero lint errors.
6. **No dead UI.** Every button, link and form must work or be deliberately absent. No lorem ipsum. No fake data on production code paths (seed data lives only in seed scripts and mocks).
7. **Verify visually.** After each UI phase, open the app with the browser tool at **390×844** (mobile) and **1440×900** (desktop). Fix misalignment, overflow and inconsistent spacing. Save screenshots to `docs/screens/part1/`.
8. **Commit after every phase** with conventional commits. Work on branch `part/1-foundation`. Tag checkpoints exactly as named in Section 10.
9. **Keep answers and docs concise.** Write complete files rather than snippets. Keep docs short and factual.
10. **Security claims must be honest.** Say the project "follows" standards. Never write "unbreakable".

---

# 1. THE WHOLE APP IN ONE VIEW

**ClubSync — "one calendar, zero clashes."** A web platform where college clubs create activities with capacity and schedule, students register, and the system prevents registration and schedule conflicts, runs fair waitlists, and tracks participation.

**The four parts (each built by a separate agent, all share one monorepo and one contract):**

| Part | Name | One-sentence scope |
|---|---|---|
| **1 (YOU)** | Foundation, Design System, Auth & Admin | Monorepo, shared contract, full database schema, backend core, design system and visualization components, app shells, registration/OTP/login/roles, admin panel (organizer approval, clubs, venues, users, settings), integration tooling. |
| 2 | Engine & Realtime (backend) | Event CRUD/feed/venue-clash API, the locked registration transaction (eligibility → clash → seat or waitlist), smart promotion, confirm-or-release worker, swap/confirm/decline, notifications (in-app + Resend email), Socket.io realtime, signed single-use QR passes and check-in, `.ics` export, and the 50-simultaneous-registrations load test. |
| 3 | Student App (mobile-first UI) | Home feed (Live/Today/Upcoming), club and event pages with seat visuals, registration/clash/swap/promotion-confirm flows, My Schedule, My Passes (QR, works offline), notifications UI, and PWA polish. |
| 4 | Organizer Console & Extras | Organizer dashboard, create-event with live venue-clash check, event management (attendees, waitlist, QR scanner, attended/no-show, WhatsApp links), club profile, timetable-aware slot finder with permission-letter PDF, analytics (stretch), production Docker Compose + Cloudflare Tunnel + demo runbook. |

**You are the base.** Parts 2, 3 and 4 will import from your `packages/shared`, `apps/api/src/core`, `apps/web/src/core`, `apps/web/src/design-system` and `apps/web/src/viz`, and will add their own modules that your loaders auto-discover. Design every one of those seams deliberately.

---

# 2. FULL PROJECT CONTEXT

## 2.1 Event and team
- Event: CBC 2.0 Hackathon, build phase. Problem Statement **PS-37 — College Club Activity Management**. Domain: Software & Web Development.
- Team **CLEVERFYRE** (Team ID CBC 053), SJB Institute of Technology, Bengaluru. Team of 4. Build window about 24 hours.
- Judges will watch a live demo. **UX and UI quality are the main focus** because the problem is simple on the surface. Treat the product as a **scheduling and fairness engine, not a CRUD app.**

## 2.2 Problem statement (organizer wording)
**Problem:** Students participate in multiple clubs and activities, making it difficult to manage event schedules, registrations, limited seats, and participation conflicts.
**Objective:** Build a platform for managing club activities while preventing registration and schedule conflicts.
**Workflow:** (1) Club creates an activity with capacity and schedule. (2) Students view and register for activities. (3) System checks capacity and conflicting registrations. (4) Full activities use a waitlist. (5) Club updates participation status.
**Key requirements:** club and activity management; student registration; capacity and waitlist handling; schedule conflict detection; participation tracking.
**Edge cases:** activity reaches capacity; student registers for overlapping activities; student cancels and releases a seat.
**Scope:** Must have: activity creation, registration, capacity, waitlist, conflict handling. Stretch: participation recommendations or activity analytics.
**Demo:** create activities with limited capacity, register students, demonstrate conflicts and waitlist promotion.

## 2.3 Core rules (the heart of the product; Parts 2–4 implement them, you encode the data model and shared helpers)
- **Overlap definition:** `startA < endB AND endA > startB`. Back-to-back events (one ends 3:00, next starts 3:00) are **not** a clash.
- **Clash rule:** a **confirmed seat**, or a **promoted seat still inside its confirm window**, blocks any overlapping registration, and the block screen shows swap suggestions. A **waitlist spot blocks nothing**: a student can be waitlisted on overlapping events, or confirmed on B while waitlisted on A.
- **Promotion while holding a clash:** if a student is promoted on A while holding B, they choose **"Confirm A (releases B) or pass on A."** Confirming A releases B and B's waitlist advances automatically.
- **Preferred-event waitlist:** a student holding a seat in B may join A's waitlist as a "preferred event"; same promotion choice, no extra logic.
- **Registration transaction (one DB transaction):** lock the event row (`SELECT … FOR UPDATE`) and take a per-student Postgres advisory lock → check eligibility (year/department) → check overlapping confirmed/in-window registrations (block + swap suggestions) → if seats remain create a confirmed registration and QR pass → else add to waitlist with a position.
- **Waitlist and smart promotion:** when a seat frees (cancel, expired confirm window, organizer removal), promote the **next student who is both eligible and free**; students who now have a clash are skipped. First-come, first-served; positions shift up live.
- **Confirm-or-release window:** promoted student gets **30 minutes** (default) to confirm; **demo mode shortens it to 60 seconds**. If unclaimed, the seat moves to the next eligible student. Timers are driven by an `expiresAt` column and a worker (node-cron), never in-memory timers. **In-app live notification (countdown ring) is primary; email via Resend is the backup.**
- **Cancellation:** a student can cancel; the seat is released and the next eligible student is promoted.
- **Eligibility:** organizers can restrict events by **years** and **departments**.
- **Venue clash:** two events cannot occupy the same venue at overlapping times (live check in the create-event flow, plus a database-level guarantee you will add, Section 5).
- **QR passes:** unique per registration; tokens are **HMAC-signed, single-use, tied to one participant and one event**; organizer scans on a phone at the door; scanning marks attendance; no-shows are tracked.
- **WhatsApp:** phone is collected because clubs use WhatsApp; organizers get a `wa.me` deep link per participant (no WhatsApp API).
- **Personal timeline:** student's own schedule with clashes highlighted and `.ics` export.
- **Proposed feature (Part 4, removable):** timetable-aware slot finder scoring candidate slots against the event's eligible audience (years/departments), week heatmap in accent shades, and a **draft** permission letter + OD (on-duty) list as PDF. The letter is a draft for signature, never an auto-submission.
- **Stretch (not now):** analytics (fill rate, no-show rate, co-attendance recommendations), Google sign-in on college domain, no-show penalty.

## 2.4 Roles
| Role | Access |
|---|---|
| **Student** | Mobile-first. Browse home feed, clubs, events; register; see seats, waitlist position, schedule, QR passes. |
| **Club organizer** | Desktop-first, also good on phone (used at the door). Signs up, then **admin approves them to specific clubs**; after approval they have **full access to their club**: create events, set seats and eligibility, accept/manage participants, scan QR, mark attendance, manage waitlist. Server-side ownership checks: an organizer can only touch their own clubs. |
| **Admin** | One admin panel: approves organizers and assigns them to specific clubs; manages clubs, venues, users, settings; views the audit log. |

One codebase, one app, role-based logins (not separate apps).

## 2.5 Accounts and registration (must "work perfectly")
- Email + password with **OTP verification** of the college email. Password reset flow. Rate limits on login, OTP, resend.
- Collected data (and only this): **name, college email, USN, department, year, phone**.
- **USN and phone are encrypted at rest (AES-256-GCM).** Phone is visible only to organizers of events that the student registered for.
- Passwords are **hashed with argon2id**, never encrypted.
- Sessions: **httpOnly, Secure, SameSite cookie sessions** (not JWTs in localStorage), with CSRF protection.
- Google sign-in is a stretch; skip it.

## 2.6 Screens (for whole-app awareness)
- **Student (mobile-first):** Home feed with **Live now / Today / Upcoming**, club chips, search, live seat meters; Club page; Event page (seat visual, Register, waitlist position); My Schedule (timeline with clashes highlighted); My Passes (QR tickets).
- **Organizer (desktop-first):** Dashboard; create-event flow (live venue-clash check, seats, time, venue, eligibility); event management (live attendee list, waitlist, QR scanner, attended/no-show); club profile.
- **Admin:** approve organizers and assign clubs; users; venues; settings; audit log.

## 2.7 Visual and UX direction (LOCKED)
- Feel: a **"campus noticeboard"** — warm off-white paper, near-black ink, **one hot vermilion accent**, ticket-style cards with perforated edges.
- **Forbidden ("no AI slop"):** indigo/purple/dark-blue schemes, gradients, glassmorphism, glowing/soft drop shadows, emoji icons, stock shadcn look, green "online/service up" dots, gradient text, centered gradient hero, generic stat cards with colored icon circles.
- Visualize everything possible: **seat grid that fills live, waitlist queue whose positions shift up, countdown ring for the confirm window, ticket-style passes with perforated edge, side-by-side clash overlap on a timeline, animated counters, accent-shade week heatmap.**
- Motion: **good, smooth, simple.** Framer Motion layout animations and springs; subtle; respect `prefers-reduced-motion`.
- Student side mobile-first; organizer/admin desktop-first but fully usable on mobile.
- **The UI must be identical in language across every part:** same tokens, same components, same spacing, same copy tone. This is enforced by the design system you build (Section 6) and a lint script (Section 9).

## 2.8 Security (follow these; no compromises, honest claims)
argon2id passwords · httpOnly/Secure/SameSite cookies + CSRF · rate limits on login/OTP/resend/reset · Helmet · Zod validation on **every** input · parameterized queries only · server-side role and ownership checks · HMAC-signed single-use QR tokens · AES-256-GCM field encryption for USN/phone · data minimization · Postgres bound to localhost · no open ports (Cloudflare Tunnel is outbound-only) · audit log of admin/organizer actions.

## 2.9 Tech stack (LOCKED — changing it loses points)
**Frontend:** React 18, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS (v3.4, config-based tokens), Radix UI primitives, Framer Motion, installable PWA, `@yudiel/react-qr-scanner` (Part 4). 
**Backend:** Node.js, Express 4, TypeScript, Socket.io, Zod, argon2 (argon2id), Helmet, express-rate-limit, node-cron, Resend, `qrcode`. Shared TS types/validation between frontend and backend. `@react-pdf/renderer` (Part 4 only, proposed).
**Data/hosting:** PostgreSQL 16 in Docker, Prisma ORM (raw SQL for `FOR UPDATE`, advisory locks, constraints), cookie sessions, AES-256-GCM, Docker Compose, Cloudflare Tunnel (self-hosted on a laptop). **No load balancers. No payments. No native app. No heavy auth beyond email+OTP.**
**Allowed small additions (log each in DEVIATIONS.md as "tooling"):** `@fontsource-variable/bricolage-grotesque` (self-hosted font), `@radix-ui/react-icons` (icons), `vite-plugin-pwa`, `clsx`, `vitest`, `eslint` + `prettier`, `tsx`, `concurrently`, `pino` (logging with redaction). Use native `Intl` for dates; no date library.

## 2.10 Demo script (what the finished app must support)
Create a 2-seat event → register 3 students (third waitlisted) → register one student for an overlapping event (blocked with suggestion) → cancel a seat → waitlisted student is promoted live on a second screen with a confirm countdown ring → QR check-in on a phone → 60-second demo-mode confirm cycle → 50 simultaneous registrations on a 10-seat event end with exactly 10 taken.

---

# 3. ARCHITECTURE AND MODULARITY (the most important section for integration)

## 3.1 Monorepo (npm workspaces)
```
clubsync/
├─ package.json                 # workspaces: apps/*, packages/*
├─ ownership.json               # who owns which paths (Section 3.3)
├─ docker-compose.yml           # dev: postgres 16 on 127.0.0.1:5432 only
├─ .env.example
├─ README.md
├─ docs/                        # CONTRACT.md, INTEGRATION.md, DECISIONS.md, DEVIATIONS.md, handoff/, screens/
├─ scripts/                     # verify-all, verify-ownership, check-boundaries, lint-design, contract-check,
│                               # contract-docs, handoff, integrate, merge-package-json
├─ packages/shared/             # @clubsync/shared — types, zod schemas, contract, constants, time helpers
├─ apps/api/
│  ├─ prisma/                   # schema.prisma + migrations (PART 1 ONLY)
│  ├─ seed/                     # index.ts runner + p1-base.ts (each part adds its own pN-*.ts)
│  └─ src/
│     ├─ core/                  # app factory, config, db, logger, errors, http, security, crypto, mail, audit, settings,
│     │                         # realtime hub (no-op default), jobs scheduler, module loader, contract router
│     └─ modules/<id>/          # module.ts (+ routes.ts, service.ts, public.ts, *.test.ts)
└─ apps/web/
   ├─ vite.config.ts
   └─ src/
      ├─ core/                  # router builder, module loader, shells wiring, api client, session, socket, mocks, slots
      ├─ design-system/         # tokens, primitives, layout, forms, feedback, motion
      ├─ viz/                   # presentational visualization components (props-driven, no fetching)
      ├─ pwa/                   # manifest.ts, runtimeCaching.ts, register.ts (Part 3 will refine)
      └─ modules/<id>/          # module.ts (+ pages/, components/, hooks/, mocks.ts)
```
Dev ports: web **5173**, api **4000**, postgres **5432** (bound to 127.0.0.1). Vite proxies `/api` and `/socket.io` to the API so everything is **same-origin** (cookies work, matches Cloudflare Tunnel production where the API also serves the built web app via an optional `WEB_DIST` env).

## 3.2 Plug-in module system (zero edits to shared files when adding a module)

**Backend module contract** (`apps/api/src/core/module.ts`):
```ts
export interface ApiModule {
  id: string;                         // folder name, e.g. "auth"
  part: 1 | 2 | 3 | 4;
  register?(ctx: ModuleContext): void | Promise<void>;       // mount routes via defineRoute()
  onServerReady?(server: import('http').Server, ctx: ModuleContext): void; // e.g. Part 2 attaches Socket.io
  jobs?: Array<{ name: string; cron: string; run(ctx: ModuleContext): Promise<void> }>; // node-cron, 6-field cron allowed (seconds)
}
export interface ModuleContext {
  prisma: PrismaClient; config: AppConfig; log: Logger;
  mailer: Mailer; audit: AuditService; settings: SettingsService; crypto: CryptoService;
  realtime: RealtimeHub;              // default NoopRealtimeHub; Part 2's realtime module swaps in the Socket.io hub
  setRealtimeHub(hub: RealtimeHub): void;
  guards: typeof guards;              // requireAuth, requireRole, requireClubOrganizer, requireEventOrganizer
}
```
- The loader scans `apps/api/src/modules/*/module.ts` at boot (default export = `defineModule({...})`), sorts by `part` then `id`, registers each, starts jobs. A folder that does not exist simply does not load.
- `defineRoute(endpoint, ...middlewares, handler)` binds a handler to a contract endpoint (Section 4.4): it mounts the method and path, validates params/query/body with the contract's Zod schemas, applies the endpoint's declared access guard automatically, and in non-production validates the response against the contract's response schema.
- **Unimplemented endpoints auto-respond `501 NOT_IMPLEMENTED`** with `details.ownerPart`, so the frontend of any part can run while other parts are missing.
- `RealtimeHub` interface: `toUser(userId, event, payload)`, `toEvent(eventId, event, payload)`, `toClub(clubId, event, payload)`; default implementation does nothing.
- **Cross-module rule (API):** modules may **read** any table through Prisma, but **write only to tables they own** (Section 3.4). Calling another module's logic must go through that module's `public.ts`. The `check-boundaries` script enforces this.

**Web module contract** (`apps/web/src/core/module.ts`):
```ts
export interface WebModule {
  id: string; part: 1 | 2 | 3 | 4;
  routes?: Array<{
    shell: 'auth' | 'student' | 'organizer' | 'admin' | 'bare';
    path: string;                      // relative to the shell base (/auth, /app, /organizer, /admin); "" = shell index
    roles?: Role[];                    // defaults to the shell's roles
    lazy: () => Promise<{ default: React.ComponentType }>;
    handle?: { title?: string };
  }>;
  nav?: Array<{ shell: 'student' | 'organizer' | 'admin'; label: string; to: string; icon: IconComponent; order: number; mobile?: boolean }>;
  slots?: Partial<Record<SlotId, React.ComponentType>>;  // SlotId: 'student.topbar.right' | 'student.overlay' | 'organizer.topbar.right' | 'admin.topbar.right' | 'app.overlay'
}
```
- Core uses `import.meta.glob('../modules/*/module.ts', { eager: true })` to build the React Router tree, navigation and slots. Adding a module = adding a folder.
- Shell base paths and default routes are fixed by contract (Section 4.5). If no module provides a shell's index route, core renders a `ModuleMissing` page naming the owning part.
- **Mock layer:** if `VITE_USE_MOCKS=true`, `api.call()` first looks for a handler in `modules/*/mocks.ts` (`export default Partial<Record<EndpointId, (req) => Response>>`) and falls back to the network. In mock mode, `?as=student|organizer|admin` (kept in `sessionStorage`) selects a demo identity served by your auth mocks. This lets Parts 3 and 4 develop their UI without a running backend.
- **Cross-module rule (web):** a module imports only from `@/core`, `@/design-system`, `@/viz`, `@clubsync/shared` and its **own** folder. Never from another module.

## 3.3 Ownership map (create `ownership.json` from this; scripts enforce it)

| Area | Part |
|---|---|
| `packages/shared/**` except the files listed under Part 2 and Part 4 below; `apps/api/src/core/**`; `apps/api/prisma/**`; `apps/api/seed/index.ts`, `apps/api/seed/p1-*.ts`; `apps/api/src/modules/{auth,admin,clubs,meta}/**`; `apps/web/src/{core,design-system,viz,pwa}/**` (Part 3 may edit `pwa/**` and `public/icons/**`); `apps/web/src/modules/{auth,admin}/**`; `apps/web/{vite,tailwind,postcss}.config.*`; root configs, `scripts/**`, `docker-compose.yml`, `.env.example`, `README.md`, `docs/*.md` (not `docs/handoff/part-{2,3,4}.md`) | **1** |
| `packages/shared/src/{dto/events.ts,dto/registrations.ts,dto/notifications.ts,contract/p2.ts}`; `apps/api/src/modules/{events,registrations,notifications,realtime,checkin,jobs}/**`; `apps/api/seed/p2-*.ts`; `scripts/loadtest.mjs`; `docs/ENGINE.md`; `docs/handoff/part-2.md` | **2** |
| `apps/web/src/modules/student-*/**`; `apps/web/src/pwa/**` and `apps/web/public/icons/**` (refinement); `docs/handoff/part-3.md` | **3** |
| `packages/shared/src/{dto/planning.ts,contract/p4.ts}`; `apps/api/src/modules/{timetable,slotfinder,letters,analytics}/**`; `apps/web/src/modules/{organizer-*,slotfinder,admin-timetable,analytics}/**`; `apps/api/seed/p4-*.ts`; `docker-compose.prod.yml`, `docker/**`, `cloudflared/**`, `docs/DEPLOY.md`, `docs/DEMO_CHECKLIST.md`; `docs/handoff/part-4.md` | **4** |

Part 3 owns **no** contract endpoints; it consumes Parts 1 and 2. If any part needs a change in a file it does not own (for example a new column), it must not edit it: it writes the request to `docs/schema-requests/part-N.md` and the integrator applies it.

## 3.4 Table ownership (writes)
- **Part 1:** `User, Session, OtpCode, Club, ClubOrganizer, Venue, Setting` (audit log is append-only through `core/audit` by everyone).
- **Part 2:** `Event, Registration, Notification`.
- **Part 4:** `TimetableSlot, AcademicCalendarEntry, Letter`.

## 3.5 Dev-only auth bypass (so other devices can test without the UI)
Support header `X-Dev-User: <email>` that authenticates as a seeded user **only if** `NODE_ENV=development` **and** `DEV_AUTH_BYPASS=true`. Log a loud warning at boot when active. **Config validation must refuse to start if `NODE_ENV=production` and `DEV_AUTH_BYPASS=true`**, and a unit test must prove it.

---

# 4. THE SHARED CONTRACT (identical in all four prompts; you implement it in `packages/shared`)

## 4.1 Conventions
- JSON API under `/api`. Dates are ISO-8601 UTC strings. IDs are UUID strings. Display timezone is `Asia/Kolkata` (`APP_TIMEZONE`); store UTC.
- Success: the typed response body. Lists: `{ items: T[], nextCursor: string | null }` with `?cursor=&limit=` (default 20, max 100).
- Errors: HTTP status + `{ error: { code: ErrorCode, message: string, details?: unknown } }`.
- State-changing requests require the CSRF header `x-csrf-token` and a valid `Origin`.
- Contract files: `packages/shared/src/contract/{p1.ts,p2.ts,p4.ts}` each export an object of `EndpointDef`s; `contract/index.ts` aggregates them and **never changes**. You write first-draft but complete Zod schemas for **all** endpoints (including Parts 2 and 4) so every part compiles from day one; owners refine only their own file, additively.

```ts
export interface EndpointDef<P, Q, B, R> {
  id: string;                                   // e.g. "auth.login"
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;                                 // "/api/events/:eventId"
  access: 'public' | 'auth' | 'student' | 'organizer' | 'admin' | 'organizerOrAdmin';
  part: 1 | 2 | 4;
  params?: z.ZodType<P>; query?: z.ZodType<Q>; body?: z.ZodType<B>; response: z.ZodType<R>;
  raw?: 'pdf' | 'ics' | 'png';                  // non-JSON responses
}
```

## 4.2 Enums, errors, socket events (`packages/shared/src/{enums,errors,socket,constants,time}.ts`, Part 1 owned, frozen after Checkpoint 1)
```ts
Role = 'STUDENT'|'ORGANIZER'|'ADMIN'
OrganizerStatus = 'NONE'|'PENDING'|'APPROVED'|'REJECTED'
EventStatus = 'DRAFT'|'PUBLISHED'|'CANCELLED'|'COMPLETED'
EventPhase = 'LIVE'|'TODAY'|'UPCOMING'|'PAST'            // derived from time, not stored
RegistrationStatus = 'CONFIRMED'|'WAITLISTED'|'PROMOTED_PENDING'|'CANCELLED'|'ATTENDED'|'NO_SHOW'
CancelReason = 'USER'|'EXPIRED'|'DECLINED'|'ORGANIZER'|'SWAPPED'|'RELEASED_FOR_PREFERRED'|'EVENT_CANCELLED'
NotificationType = 'SEAT_CONFIRMED'|'WAITLISTED'|'PROMOTED'|'PROMOTION_EXPIRED'|'SEAT_RELEASED'|'EVENT_UPDATED'
                 |'EVENT_CANCELLED'|'CLASH_WARNING'|'REMINDER'|'CHECKED_IN'|'ORGANIZER_APPROVED'|'ORGANIZER_REJECTED'
OtpPurpose = 'VERIFY_EMAIL'|'PASSWORD_RESET'

ErrorCode = 'VALIDATION_ERROR'|'UNAUTHENTICATED'|'FORBIDDEN'|'NOT_FOUND'|'CONFLICT'|'RATE_LIMITED'|'CSRF_INVALID'
 |'NOT_IMPLEMENTED'|'INTERNAL'|'EMAIL_TAKEN'|'EMAIL_NOT_VERIFIED'|'INVALID_CREDENTIALS'|'ACCOUNT_LOCKED'|'ACCOUNT_DISABLED'
 |'OTP_INVALID'|'OTP_EXPIRED'|'OTP_LOCKED'|'ORGANIZER_PENDING'|'SCHEDULE_CLASH'|'NOT_ELIGIBLE'|'ALREADY_REGISTERED'
 |'EVENT_NOT_OPEN'|'EVENT_FULL'|'VENUE_CLASH'|'CONFIRM_WINDOW_EXPIRED'|'QR_INVALID'|'QR_ALREADY_USED'|'QR_WRONG_EVENT'

SOCKET_EVENTS = {
  // client → server
  JOIN_EVENT: 'room:join-event', LEAVE_EVENT: 'room:leave-event',
  // server → client
  SEATS_UPDATED: 'seats:updated',            // {eventId, capacity, confirmed, pending, waitlist}  → room event:{id}
  WAITLIST_UPDATED: 'waitlist:updated',      // {eventId, count}                                    → room event:{id}
  EVENT_UPDATED: 'event:updated',            // {eventId}                                           → room event:{id}
  REGISTRATION_UPDATED: 'registration:updated', // RegistrationDTO                                  → room user:{id}
  PROMOTION_OFFERED: 'promotion:offered',    // {registrationId, eventId, expiresAt, clashWith?}    → room user:{id}
  NOTIFICATION_NEW: 'notification:new',      // NotificationDTO                                     → room user:{id}
  CHECKIN_SCANNED: 'checkin:scanned',        // {eventId, registrationId, result}                   → room club:{id}
}
```
Socket.io path `/socket.io`; authenticated by the session cookie on handshake; rooms `user:{userId}` (auto-joined), `event:{eventId}` (joined on request), `club:{clubId}` (auto-joined for approved organizers).

`constants.ts`: `DEPARTMENTS = ['CSE','ISE','AIML','ECE','EEE','MECH','CIVIL']` (editable), `YEARS = [1,2,3,4]`, `USN_REGEX = /^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$/` (uppercase-normalized; configurable), `PHONE_REGEX` for Indian mobile numbers stored as `+91XXXXXXXXXX`, `semestersForYear(year) → [2*year-1, 2*year]`.
`time.ts`: `intervalsOverlap(aStart,aEnd,bStart,bEnd)` implementing the **strict** overlap rule (with unit tests including the back-to-back case), `eventPhase(event, now)`, and Intl-based `formatEventRange`, `formatRelative`, all in `Asia/Kolkata`.

## 4.3 DTOs (normative names; Zod schemas required; fields may be added later only as optional)
```ts
UserDTO { id, name, email, usn, department, year, phone, role, organizerStatus, emailVerified: boolean, organizerClubIds: string[] }  // usn/phone only ever returned to the owner
ClubDTO { id, name, description, organizerCount?, upcomingEventCount? }
VenueDTO { id, name }
EventCardDTO { id, title, club:{id,name}, venue:{id,name}, startsAt, endsAt, capacity, confirmedCount, pendingCount,
               waitlistCount, status: EventStatus, phase: EventPhase, myStatus: RegistrationStatus | null }
EventDetailDTO extends EventCardDTO { description, eligibleYears: number[], eligibleDepartments: string[], facultyCoordinator: string | null,
               eligibility: { eligible: boolean; reason?: string }, myRegistration: RegistrationDTO | null, myWaitlistPosition: number | null }
RegistrationDTO { id, eventId, status, waitlistPosition: number | null, isPreferred: boolean, promotedAt: string | null,
                  expiresAt: string | null, createdAt, attendedAt: string | null, event?: EventCardDTO, clashWith?: EventCardDTO | null }
SeatMapDTO { eventId, capacity, seats: { index: number; state: 'FREE'|'TAKEN'|'PENDING'|'MINE' }[], waitlistCount, myPosition: number | null }
ClashDTO { conflicting: EventCardDTO; registrationId: string; suggestions: SwapSuggestionDTO[] }
SwapSuggestionDTO { kind: 'SWAP'|'JOIN_WAITLIST'|'OTHER_EVENT'; message: string; eventId: string; releaseRegistrationId?: string }
NotificationDTO { id, type: NotificationType, title, body, payload: Record<string, unknown>, createdAt, readAt: string | null }
AttendeeRowDTO { registrationId, status, name, email, department, year, usn, phone, waLink: string, checkedInAt: string | null }  // organizer-only
SettingsDTO { demoMode: boolean; confirmWindowMinutes: number; demoConfirmWindowSeconds: number; cancelCutoffMinutes: number }
```
Files: `dto/{auth,clubs,admin}.ts` (Part 1) and first drafts of `dto/{events,registrations,notifications,planning}.ts` (their owners refine).

## 4.4 Endpoint registry (all IDs, paths, access and owning part; write complete schemas for all)

**Part 1 — implement fully**
| ID | Method + path | Access |
|---|---|---|
| health.get | GET /api/health | public |
| auth.register | POST /api/auth/register | public |
| auth.verifyOtp | POST /api/auth/verify-otp | public |
| auth.resendOtp | POST /api/auth/resend-otp | public |
| auth.login | POST /api/auth/login | public |
| auth.logout | POST /api/auth/logout | auth |
| auth.forgotPassword | POST /api/auth/forgot-password | public |
| auth.resetPassword | POST /api/auth/reset-password | public |
| auth.me | GET /api/auth/me (always 200: `{ user: UserDTO \| null, csrfToken, serverTime, settings: SettingsDTO \| null }`) | public |
| me.updateProfile | PATCH /api/me/profile | auth |
| me.changePassword | POST /api/me/change-password | auth |
| meta.public | GET /api/meta/public (departments, years, clubs `{id,name}`, allowed email domains, USN hint) | public |
| clubs.list / clubs.get | GET /api/clubs, GET /api/clubs/:clubId | auth |
| clubs.update | PATCH /api/clubs/:clubId (name/description) | organizerOrAdmin (own club) |
| venues.list | GET /api/venues | auth |
| admin.stats | GET /api/admin/stats | admin |
| admin.organizerRequests.list / .approve / .reject | GET /api/admin/organizer-requests; POST …/:userId/approve `{clubIds}`; POST …/:userId/reject `{reason?}` | admin |
| admin.clubs.create / .update / .archive | POST /api/admin/clubs; PATCH …/:clubId; DELETE …/:clubId (archive) | admin |
| admin.clubs.addOrganizer / .removeOrganizer | POST /api/admin/clubs/:clubId/organizers `{userId}`; DELETE …/organizers/:userId | admin |
| admin.venues.create / .update / .delete | POST /api/admin/venues; PATCH …/:venueId; DELETE …/:venueId | admin |
| admin.users.list / .update | GET /api/admin/users?query&role; PATCH /api/admin/users/:userId `{disabled}` | admin |
| admin.settings.get / .update | GET / PUT /api/admin/settings | admin |
| admin.audit.list | GET /api/admin/audit-log | admin |

**Part 2 — first-draft schemas, return `501` until Part 2 lands**
`events.feed` GET /api/events/feed · `events.get` GET /api/events/:eventId · `events.seats` GET /api/events/:eventId/seats · `events.create` POST /api/events (organizer) · `events.update` PATCH /api/events/:eventId · `events.cancel` POST /api/events/:eventId/cancel · `events.venueCheck` POST /api/events/venue-check · `events.listMine` GET /api/organizer/events · `events.attendees` GET /api/events/:eventId/attendees · `events.waitlist` GET /api/events/:eventId/waitlist · `events.setParticipation` POST /api/events/:eventId/registrations/:registrationId/participation `{action:'ATTENDED'|'NO_SHOW'|'REMOVE'}` · `registrations.register` POST /api/events/:eventId/register `{preferred?: boolean}` (200 → `{outcome:'CONFIRMED'|'WAITLISTED', registration}`; clash → 409 `SCHEDULE_CLASH` with `details: ClashDTO`) · `registrations.swap` POST /api/events/:eventId/swap `{releaseRegistrationId}` · `registrations.cancel` POST /api/registrations/:registrationId/cancel · `registrations.confirm` POST /api/registrations/:registrationId/confirm `{releaseRegistrationId?}` · `registrations.decline` POST /api/registrations/:registrationId/decline · `registrations.mine` GET /api/me/registrations · `registrations.schedule` GET /api/me/schedule · `registrations.scheduleIcs` GET /api/me/schedule.ics (raw ics) · `registrations.pass` GET /api/registrations/:registrationId/pass (`{ qrDataUrl, registration }`) · `checkin.scan` POST /api/checkin/scan `{token}` (organizer) · `notifications.list` GET /api/notifications · `notifications.unreadCount` GET /api/notifications/unread-count · `notifications.markRead` POST /api/notifications/:id/read · `notifications.markAllRead` POST /api/notifications/read-all.

**Part 4 — first-draft schemas, return `501` until Part 4 lands**
`organizer.dashboard` GET /api/organizer/dashboard · `timetable.get` GET /api/admin/timetable · `timetable.upsert` PUT /api/admin/timetable · `calendar.list` GET /api/admin/academic-calendar · `calendar.upsert` PUT /api/admin/academic-calendar · `slotfinder.suggest` POST /api/slot-finder/suggest · `letters.generate` POST /api/events/:eventId/letter (raw pdf) · `analytics.club` GET /api/analytics/clubs/:clubId (stretch).

## 4.5 Web route contract
| Base | Shell | Roles | Default route owner |
|---|---|---|---|
| `/auth/*` — `login`, `register`, `verify`, `forgot`, `reset`, `pending` | auth (no chrome) | public | Part 1 |
| `/profile` | student/organizer shell by role | auth | Part 1 |
| `/admin/*` — index (dashboard), `organizers`, `clubs`, `venues`, `users`, `settings`, `audit` | admin | ADMIN | Part 1 (Part 4 adds `/admin/timetable`) |
| `/app/*` — index (home feed), `clubs`, `clubs/:clubId`, `events/:eventId`, `schedule`, `passes`, `notifications` | student | STUDENT | Part 3 |
| `/organizer/*` — index (dashboard), `events`, `events/new`, `events/:eventId`, `events/:eventId/scan`, `club`, `slot-finder`, `analytics` | organizer | approved ORGANIZER | Part 4 |

Post-login redirects: student → `/app`, approved organizer → `/organizer`, pending organizer → `/auth/pending`, admin → `/admin`. `/` redirects by role (logged out → `/auth/login`). Unknown paths → a styled 404.

---

# 5. DATABASE (Part 1 owns the complete schema for all four parts)

Create `apps/api/prisma/schema.prisma` with all models below, a first migration, and the raw-SQL constraints. All `DateTime` fields use `@db.Timestamptz(3)`. IDs are `String @id @default(uuid())` unless noted. Use camelCase fields and `@@map` to snake_case tables. **This extends the original sketch** with `Session`, `OtpCode`, `Setting` and `usnHash` (all required for the agreed security design) — log them in DEVIATIONS.md.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { STUDENT ORGANIZER ADMIN }
enum OrganizerStatus { NONE PENDING APPROVED REJECTED }
enum EventStatus { DRAFT PUBLISHED CANCELLED COMPLETED }
enum RegistrationStatus { CONFIRMED WAITLISTED PROMOTED_PENDING CANCELLED ATTENDED NO_SHOW }
enum CancelReason { USER EXPIRED DECLINED ORGANIZER SWAPPED RELEASED_FOR_PREFERRED EVENT_CANCELLED }
enum OtpPurpose { VERIFY_EMAIL PASSWORD_RESET }
enum CalendarEntryType { EXAM HOLIDAY }
enum NotificationType { SEAT_CONFIRMED WAITLISTED PROMOTED PROMOTION_EXPIRED SEAT_RELEASED EVENT_UPDATED EVENT_CANCELLED CLASH_WARNING REMINDER CHECKED_IN ORGANIZER_APPROVED ORGANIZER_REJECTED }

model User {            // users
  id String @id @default(uuid())
  name String
  email String @unique              // stored lowercase
  passwordHash String               // argon2id
  role Role @default(STUDENT)
  organizerStatus OrganizerStatus @default(NONE)
  organizerNote String?             // free text from the organizer signup
  usnEnc String                     // AES-256-GCM  "v1:iv:tag:ciphertext"
  usnHash String @unique            // HMAC-SHA256 blind index for uniqueness/lookup
  phoneEnc String                   // AES-256-GCM
  department String
  year Int
  emailVerifiedAt DateTime?
  disabledAt DateTime?
  failedLoginCount Int @default(0)
  lockedUntil DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // relations: sessions, otpCodes, clubLinks, registrations, notifications, createdEvents
}
model Session {         // sessions: random 32-byte token in cookie, only its SHA-256 stored
  id String @id @default(uuid())
  userId String
  tokenHash String @unique
  createdAt DateTime @default(now())
  lastSeenAt DateTime @default(now())
  expiresAt DateTime               // 7-day sliding, 30-day absolute cap
  ip String?
  userAgent String?
  @@index([userId])
}
model OtpCode {         // otp_codes
  id String @id @default(uuid())
  userId String
  purpose OtpPurpose
  codeHash String                  // HMAC-SHA256(code, OTP_SECRET + userId + purpose)
  attempts Int @default(0)
  expiresAt DateTime
  consumedAt DateTime?
  createdAt DateTime @default(now())
  @@index([userId, purpose, createdAt])
}
model Club {            // clubs
  id String @id @default(uuid())
  name String @unique
  description String @default("")
  archivedAt DateTime?
  createdAt DateTime @default(now())
}
model ClubOrganizer {   // club_organizers
  userId String
  clubId String
  approvedById String?
  approvedAt DateTime?             // null = requested, not yet approved
  createdAt DateTime @default(now())
  @@id([userId, clubId])
}
model Venue { id String @id @default(uuid()); name String @unique; createdAt DateTime @default(now()) }
model Event {           // events
  id String @id @default(uuid())
  clubId String
  title String
  description String @default("")
  venueId String
  startsAt DateTime @db.Timestamptz(3)
  endsAt DateTime @db.Timestamptz(3)
  capacity Int
  eligibleYears Int[]              // empty = all years
  eligibleDepartments String[]     // empty = all departments
  facultyCoordinator String?
  status EventStatus @default(PUBLISHED)
  createdById String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([startsAt, endsAt])
  @@index([clubId, startsAt])
  @@index([venueId, startsAt])
}
model Registration {    // registrations
  id String @id @default(uuid())
  eventId String
  userId String
  status RegistrationStatus
  waitlistPosition Int?            // maintained by the engine inside the transaction
  waitlistedAt DateTime?
  isPreferred Boolean @default(false)
  promotedAt DateTime?
  expiresAt DateTime?              // confirm-window deadline for PROMOTED_PENDING
  cancelledAt DateTime?
  cancelReason CancelReason?
  qrTokenHash String?
  qrUsedAt DateTime?
  attendedAt DateTime?
  checkedInById String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([eventId, status])
  @@index([userId, status])
  @@index([status, expiresAt])
}
model Notification { id String @id @default(uuid()); userId String; type NotificationType; title String; body String
  payload Json @default("{}"); readAt DateTime?; createdAt DateTime @default(now()); @@index([userId, readAt, createdAt]) }
model AuditLog { id String @id @default(uuid()); actorId String?; action String; targetType String; targetId String?
  meta Json @default("{}"); ip String?; at DateTime @default(now()); @@index([at]); @@index([actorId]) }
model Setting { key String @id; value Json; updatedAt DateTime @updatedAt; updatedById String? }
model TimetableSlot { id String @id @default(uuid()); department String; semester Int; section String; dayOfWeek Int  // 1=Mon..7=Sun
  startMinute Int; endMinute Int; subject String; room String?; @@index([department, semester, section]) }
model AcademicCalendarEntry { id String @id @default(uuid()); startDate DateTime @db.Date; endDate DateTime @db.Date
  type CalendarEntryType; label String }
model Letter { id String @id @default(uuid()); eventId String; generatedById String; includesOdList Boolean @default(true)
  payload Json @default("{}"); createdAt DateTime @default(now()) }
```
Define all relations with proper `onDelete` behavior (Session/OtpCode cascade on user delete; Registration restrict).

**Raw SQL in the first migration** (add by editing the generated migration file):
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE events ADD CONSTRAINT event_time_valid CHECK ("endsAt" > "startsAt");
ALTER TABLE events ADD CONSTRAINT event_capacity_positive CHECK (capacity > 0);
-- database-level venue double-booking guard; back-to-back is allowed because ranges are half-open
ALTER TABLE events ADD CONSTRAINT event_no_venue_overlap
  EXCLUDE USING gist ("venueId" WITH =, tstzrange("startsAt","endsAt",'[)') WITH &&) WHERE (status <> 'CANCELLED');
-- one active registration per student per event (cancelled rows may repeat)
CREATE UNIQUE INDEX registration_one_active ON registrations ("eventId","userId") WHERE status <> 'CANCELLED';
CREATE INDEX registration_user_start ON registrations ("userId", status);
```
(Adjust identifiers to match Prisma's actual column/table names. Verify the migration applies on a clean Postgres 16 container.)

**Seeds** (`apps/api/seed/index.ts` runs every `p*-*.ts` file in order; you provide `p1-base.ts`): one admin (credentials from `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`), 6 demo clubs, 5 venues, 12 verified demo students across departments/years (`student01@demo.clubsync.local`… with a documented dev password), 1 approved demo organizer assigned to two clubs, default settings (`demoMode=false`, `confirmWindowMinutes=30`, `demoConfirmWindowSeconds=60`, `cancelCutoffMinutes=120`). Seeds must be idempotent and mark demo data clearly.

---

# 6. DESIGN SYSTEM SPEC (what makes the UI consistent across all four parts)

All UI is built from these tokens and components. Nothing else may define colors, fonts, radii, shadows or spacing.

## 6.1 Tokens (Tailwind config + CSS variables in `design-system/tokens.css`)
| Token | Value |
|---|---|
| `paper` | DEFAULT `#F6F1E7` (page), `deep` `#EDE5D3` (sunken areas) |
| `card` | `#FDFAF3` (raised surface) |
| `ink` | DEFAULT `#1C1917`, `soft` `#57504A` (secondary text), `mute` `#8C8478` (placeholder/disabled) |
| `line` | DEFAULT `#DDD3BF` (borders), `strong` `#BFB39B` |
| `vermilion` | DEFAULT `#D63A2B` (buttons, filled accents; white text on it), `bright` `#E34234`, `deep` `#B52D20` (accent **text** on paper), `soft` `#F9DDD7`, `wash` `#FCEFEB` |
| Semantics | No green/yellow/blue. Status is communicated by **shape + label + ink/vermilion**, never by traffic-light colors (see StatusChip). Errors use `vermilion.deep` with an icon and text. |

- **Verify WCAG AA contrast** for every text/background pair actually used (body ≥ 4.5:1). Adjust the `deep` shade if needed and log it.
- **Typography:** Bricolage Grotesque (variable, self-hosted via `@fontsource-variable`) for everything, with `ui-sans-serif, system-ui` fallback; tabular numerals for counts, timers and times. Scale: display 36/40, h1 28/34, h2 22/28, h3 18/24, body 16/24 (never smaller than 16 on form inputs), small 14/20, micro 12/16 (floor). Weights 400/500/600/700. (Font choice is AI-picked and pending team confirmation: keep it a single token in `tailwind.config` so it is a one-line swap.)
- **Radius:** `sm 6px`, `md 10px`, `lg 16px`. **Borders:** 1px `line`. **Shadows:** none by default; if elevation is needed (popovers, sheets) use a single hard, small, low-opacity ink shadow token `elevate`. No glow, no blur.
- **Spacing:** 4px base scale. Page padding 16 (mobile) / 24 (tablet) / 32 (desktop). Section gap 24; card padding 16 (mobile) / 20 (desktop); form field gap 16. Student content max-width 720px centered on desktop (feed becomes 2 columns ≥ 768); console content max-width 1200px.
- **Breakpoints:** Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`).
- **Motion presets** (`design-system/motion.ts`): `spring.soft {stiffness 260, damping 30}`, `spring.snappy {stiffness 420, damping 34}`, `fade 150ms`, `rise 200ms`. Wrap the app in `MotionConfig reducedMotion="user"`.
- **Tailwind rule:** no arbitrary values (`w-[13px]`, `text-[#fff]`) outside `design-system/`. Tokens only.

## 6.2 Primitives and layout (`design-system/`)
`Button` (primary vermilion, secondary ink outline, ghost, danger; sizes; loading state), `IconButton`, `Link`, `Card`, `Page`, `PageHeader` (title, description, actions, back), `Section`, `Stack`, `Inline`, `Grid`, `Divider`, `Avatar` (initials), `Badge`, `StatusChip`, `Tooltip`, `DropdownMenu`, `Dialog`, `ConfirmDialog`, `Sheet` (bottom sheet on mobile, side sheet on desktop), `Toast` (Radix) with `useToast`, `Tabs`, `Skeleton`, `Spinner`, `EmptyState` (plain-language copy + one action), `ErrorState` (with retry), `DataTable` (a real table ≥ md, stacked cards < md, with loading/empty/error states), `LoadMore`, `Logo` (wordmark "ClubSync" with a small vermilion stamp-like mark; simple SVG you design) and a small custom inline-SVG or `@radix-ui/react-icons` icon set wrapper `Icon`.

**Forms:** `Field` (label, hint, error, required marker; wired to `aria-*`), `TextInput`, `PasswordInput` (show/hide), `PhoneInput` (+91 prefix, 10-digit), `OtpInput` (6 boxes, auto-advance, paste support, backspace navigation, `autocomplete="one-time-code"`), `Select` (Radix), `Checkbox`, `Switch`, `SegmentedControl`, `ChipMultiSelect`, `Textarea`, `DateTimeField` (styled native `datetime-local`), `NumberStepper`. Inline validation uses the shared Zod schemas. Minimum touch target 44×44px on student/mobile surfaces.

**StatusChip mapping (no traffic lights):** CONFIRMED = solid ink chip with check icon; WAITLISTED = dashed-outline chip with queue icon; PROMOTED_PENDING = vermilion-soft chip with clock icon; CANCELLED = muted, struck-through; ATTENDED = ink chip with double-check; NO_SHOW = vermilion outline chip; event phases LIVE = vermilion solid with a small pulsing square (not a green dot), TODAY = ink outline, UPCOMING = plain, PAST = muted.

## 6.3 Visualization components (`apps/web/src/viz/`; presentational, props-driven, no data fetching; used by Parts 3 and 4)
| Component | Contract |
|---|---|
| `SeatGrid` | `{ capacity, taken, pending?, mine?, seats?: SeatMapDTO['seats'], compact? }`. Seat icons: taken = filled ink, pending = vermilion hatched outline, free = outline, mine = filled vermilion. Seats animate in/out with layout springs. ≤ 60 seats: individual icons; 61–200: compact dot-matrix in rows of 10; > 200: falls back to `SeatMeter`. |
| `SeatMeter` | `{ capacity, taken, pending? }` segmented bar with `AnimatedNumber` "12 / 40" and a "Full" state. |
| `WaitlistQueue` | `{ entries: { position, label, isMe?, isPreferred? }[], maxVisible? }`. Positions shift up with layout animation when entries leave. "You" row is highlighted in vermilion. |
| `CountdownRing` | `{ expiresAt, totalSeconds, size?, onExpire? }`. SVG ring that drains in vermilion, mm:ss in tabular numerals, uses `useServerNow()` so clocks match the server, turns `deep` and pulses subtly in the last 10 seconds. |
| `AnimatedNumber` | `{ value, format? }` counts smoothly between values. |
| `TicketCard` | `{ title, subtitle?, meta: {label,value}[], stub?: ReactNode, status? }` with a perforated divider (CSS mask notches; no gradients as decoration) and a stub area for the QR. |
| `ClashTimeline` | `{ a: {title,start,end}, b: {title,start,end} }` two bars on a shared time axis with the overlapped region hatched in vermilion; labels the overlap duration. |
| `WeekHeatmap` | `{ days, hourRange, cells: {day,hour,score 0..1,label?}[], onSelect? }`; lighter = fewer clashes, shades interpolated from `wash` to `vermilion`, keyboard accessible. |
| `EventCard` | `{ event: EventCardDTO, variant: 'feed' | 'row', onClick? }` using `SeatMeter`, `StatusChip`, time range, club and venue; the single event-card look for the whole app. |
| `QRImage` | `{ dataUrl, size, caption? }` crisp pixel-rendered QR with quiet zone. |

Also provide `useServerNow()` (offset computed from `auth.me.serverTime` and refreshed every few minutes) and `useReducedMotion` wrappers.

## 6.4 Shells (`apps/web/src/core/shells/`)
- **AuthShell:** mobile single column; desktop split with a noticeboard-style panel (tagline "one calendar, zero clashes", a few pinned ticket motifs drawn in CSS/SVG; no stock imagery) and the form card.
- **StudentShell:** top bar (logo, slot `student.topbar.right`), **bottom tab bar on mobile** built from registered `nav` items (max 5, `mobile: true`), horizontal top nav on ≥ lg; content max-width per tokens; renders slot `student.overlay` and `app.overlay` (Part 3 mounts the promotion/confirm overlay there).
- **ConsoleShell** (used for organizer and admin with different nav sets): left sidebar ≥ lg (248px), hamburger `Sheet` below; top bar with page title, slot `organizer.topbar.right` / `admin.topbar.right`, and the user menu (profile, logout).
- Every page uses `Page` + `PageHeader`. Every list has skeleton, empty and error states. Focus rings visible. Landmarks (`header`, `nav`, `main`) present. Keyboard navigable.

## 6.5 Design Gallery
Dev-only route `/dev/design` (only when `import.meta.env.DEV`) showing every primitive, form control, StatusChip state and viz component with realistic sample data in all their states, at mobile and desktop widths, plus the color/type/spacing scale. Parts 2–4 and the integrator use it to check consistency. Take screenshots into `docs/screens/part1/`.

## 6.6 Copy and tone
Plain, friendly, concise, "noticeboard" voice. Sentence case. Buttons are verbs ("Register", "Confirm seat", "Pass"). Errors say what happened and what to do next. No exclamation spam, no emoji.

---

# 7. PART 1 BUILD SPEC — BACKEND

## 7.1 `apps/api/src/core/`
- **config:** Zod-validated env, fail fast. Variables: `NODE_ENV, PORT, APP_ORIGIN, APP_TIMEZONE, DATABASE_URL, FIELD_ENCRYPTION_KEY` (32 bytes, base64), `OTP_SECRET, QR_HMAC_SECRET, CSRF_SECRET, USN_HASH_SECRET, RESEND_API_KEY?, MAIL_FROM, ALLOWED_EMAIL_DOMAINS` (default `sjbit.edu.in`), `ALLOW_ANY_EMAIL_DOMAIN` (dev only), `TRUST_PROXY, WEB_DIST?, DEV_AUTH_BYPASS, ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD`. Provide `.env.example` with generated-key instructions and a `npm run gen:secrets` script.
- **app factory** (`createApp()` returns `{ app, server }`): Helmet with a real CSP (self-hosted fonts, `connect-src 'self'` plus websocket, relaxed only in dev for Vite), `x-powered-by` off, JSON body limit 100kb, `trust proxy` per config (Cloudflare Tunnel), request-id, pino logging with redaction (passwords, OTPs, tokens, phone, USN), central error handler producing the contract error shape, 404 handler, optional static serving of `WEB_DIST` with SPA fallback.
- **security:** session middleware (loads `cs_sid` cookie → `Session` → `req.user`, sliding expiry, cookie `httpOnly`, `Secure` when `APP_ORIGIN` is https, `SameSite=Lax`); CSRF (signed double-submit token bound to the session, `x-csrf-token` header, plus `Origin` check) on all non-GET requests; `rateLimit(name, opts)` factory (keys include IP and, where relevant, email); global API limiter.
- **guards:** `requireAuth`, `requireRole(...roles)`, `requireClubOrganizer(getClubId)` (approved `ClubOrganizer` row; admin passes), `requireEventOrganizer(getEventId)` (resolves event → club → organizer). All server-side, all return contract errors. Blocks pending/rejected organizers from organizer endpoints with `ORGANIZER_PENDING`; blocks disabled accounts.
- **crypto:** `encryptField / decryptField` (AES-256-GCM, random 12-byte IV, versioned `v1:` format), `usnBlindIndex()`, `hmacSign/verify`, `randomToken()`, `timingSafeEqual` helpers. Unit-tested (round trip, tamper detection, wrong key).
- **mail:** `Mailer` interface with `ResendMailer` (Resend SDK) and `ConsoleMailer` (logs to terminal when no API key, used in dev). Templates for OTP, password reset, organizer approved/rejected; Part 2 adds seat-offer emails through this same service. Plain, minimal HTML in the app's palette.
- **audit:** `audit.record({ actorId, action, targetType, targetId, meta, ip })`. **settings:** typed `get/set` over `Setting` with defaults and a short in-memory cache invalidated on write. **jobs:** node-cron scheduler that starts module jobs, logs failures, never crashes the process.
- **module loader, `defineRoute`, contract router, 501 stubs, `RealtimeHub` no-op, dev auth bypass** per Section 3.

## 7.2 Modules you implement
- **`auth`** — `register`: validate with shared Zod (name, college email on allowed domain, USN regex, department, year 1–4, phone, password ≥ 10 chars with a letter and a number, role `STUDENT` or `ORGANIZER`; organizers may pick requested clubs + a note). Normalize email/USN, encrypt USN/phone, compute `usnHash`, hash password with argon2id (OWASP-recommended parameters), create unverified user, send OTP. Existing verified email → `409 EMAIL_TAKEN` (accepted trade-off, note in DECISIONS.md); existing unverified → refresh OTP. `verifyOtp`: 6-digit CSPRNG code, HMAC-hashed, **10-minute TTL, max 5 attempts then `OTP_LOCKED`, single use**, constant-time compare; on success set `emailVerifiedAt`, create session (rotate), set cookies. `resendOtp`: ≥ 60s between sends, ≤ 5/hour/email, generic response. `login`: constant-time-ish failure path, generic `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED` (with auto-resend hint), progressive lockout after 5 failures (`ACCOUNT_LOCKED`, 15 min), `ACCOUNT_DISABLED`; new session on login. `logout`: delete session, clear cookies. `forgotPassword`/`resetPassword`: always-generic response, OTP purpose `PASSWORD_RESET`, on reset revoke **all** sessions. `me`: user (or null) + CSRF token + `serverTime` + settings. `me.updateProfile` (name, department, year, phone) and `me.changePassword` (verify current, revoke other sessions). `public.ts` exports: `getUserById`, `isOrganizerOfClub`, `canOrganizerViewStudentContact(organizerId, studentId)` (true only if the student has a non-cancelled registration in an event of a club the organizer is approved for; used by Part 2/4 to gate phone/USN).
- **`admin`** — stats (counts of users by role, clubs, venues, pending organizer requests, events if table has rows); organizer requests list/approve/reject (approve sets `organizerStatus=APPROVED`, creates/updates `ClubOrganizer` rows with `approvedAt/By` for the chosen clubs, sends email + creates an in-app `ORGANIZER_APPROVED` notification row; reject stores a reason, sends email); club create/update/archive; add/remove organizers on a club; venue CRUD (refuse delete if used by events); user list with search/role filter and enable/disable (disabling revokes sessions; an admin cannot disable themselves and the last admin cannot be removed); settings get/update (validated: `demoMode`, `confirmWindowMinutes` 1–240, `demoConfirmWindowSeconds` 10–600, `cancelCutoffMinutes` 0–1440) — the admin **demo-mode switch** is how the team flips the confirm window to 60 seconds live; audit-log list with filters and cursor pagination. Every mutation writes an audit record.
- **`clubs`** — list/get (non-archived), update by approved organizer of that club or admin. **`meta`** — public bootstrap data for the register form. **`venues.list`** lives in `admin` or `clubs` (your choice, document it).

## 7.3 Tests (Vitest, in `apps/api/src/**/*.test.ts` and `packages/shared`)
Overlap helper (including back-to-back), crypto, config refusing prod + dev bypass, OTP lifecycle (expiry, attempts, reuse), login lockout, CSRF rejection, role/ownership guards, organizer approval flow, `canOrganizerViewStudentContact`, contract-registry sanity (unique IDs, valid paths).

---

# 8. PART 1 BUILD SPEC — WEB

## 8.1 `apps/web/src/core/`
Router builder (React Router data router, lazy routes, `RequireRole`, shells, `ModuleMissing`, 404), module loader, **typed `api.call(endpoint, { params, query, body })`** generated from the contract (attaches CSRF, parses the contract error shape into `ApiError`, redirects to login on `UNAUTHENTICATED`, supports mock mode), `useApiQuery` / `useApiMutation` wrappers over TanStack Query (sane defaults: no refetch-on-focus storms, retry only on network errors), `SessionProvider` + `useSession()` (user, role, settings, `serverNow`), socket client singleton with `useSocketEvent(event, handler)` and `useEventRoom(eventId)` (typed from `SOCKET_EVENTS`; **no connection-status "online" dot anywhere**), slot renderer, mock layer with `?as=` identities, error boundary, global toast host, `MotionConfig`.
`vite.config.ts`: proxy, path aliases (`@/`, `@clubsync/shared`), `vite-plugin-pwa` with manifest (name ClubSync, theme color vermilion, background paper, placeholder icons) and basic app-shell caching sourced from `src/pwa/*` so Part 3 can refine without touching Vite config.

## 8.2 Pages you build (modules `auth` and `admin`)
- **`/auth/register`** — mobile-first multi-step: (1) role segmented control **Student / Club organizer**; (2) details (name, college email, USN, department, year, phone) with inline validation and clear examples; (3) password with strength hint; organizer path also shows a club multi-select and a "tell us about your role" note; (4) **OTP verification** screen (6-box input, resend timer, error and lock states, "wrong email? go back"); success → correct post-login destination. Progress indicator, no layout jumps, all errors inline and announced to screen readers.
- **`/auth/login`**, **`/auth/forgot`**, **`/auth/reset`** (email → OTP → new password), **`/auth/pending`** (organizer awaiting approval: calm explanation, status, logout, auto-refresh when approved), **`/profile`** (edit name/department/year/phone, change password, logout; shows USN read-only masked).
- **Admin (`/admin/*`, ConsoleShell):** Dashboard (key counts, pending requests preview); **Organizers** (pending/approved/rejected tabs, review `Dialog` with club multi-select to assign, approve/reject with reason); **Clubs** (table, create/edit/archive, manage organizers); **Venues** (CRUD); **Users** (search, role filter, enable/disable); **Settings** (demo-mode `Switch` that visibly states "Confirm window: 60 seconds" vs "30 minutes", the numeric settings, save with toast); **Audit log** (filterable table).
- All forms use shared Zod schemas, `Field` components and the design system exclusively. Every page has skeleton/empty/error states and is verified at both viewports.

## 8.3 Placeholders
Only the `ModuleMissing` fallback for `/app` and `/organizer` index routes (naming Part 3 / Part 4). Do not build any student or organizer pages.

---

# 9. INTEGRATION SYSTEM (you build the tooling; the other parts and the main device use it)

Goal: each part is developed on its own device and branch, then merged on one **main device** with **no breakage**. `main` must never be left broken.

## 9.1 Rules that make merges conflict-free
Disjoint ownership (Section 3.3), plug-in module discovery (no central registries), per-part contract/DTO/seed files, additive-only shared enums, schema owned solely by Part 1 (requests go to `docs/schema-requests/`), no cross-module imports, and a shared design system.

## 9.2 Scripts (cross-platform Node `.mjs`, no new dependencies; expose as npm scripts)
| Script | Purpose |
|---|---|
| `npm run verify` → `scripts/verify-all.mjs [--strict] [--with-db]` | Runs, in order: **ownership check** (changed files vs `ownership.json` for the current branch's part), **boundaries check** (no cross-module imports; modules only touch tables they own via Prisma writes, heuristically), **design lint** (no hex colors or Tailwind arbitrary values outside `design-system/`, no gradients, no emoji in source, no `localStorage` for auth), `prisma validate`, `tsc -b` typecheck for all workspaces, ESLint, Vitest, **contract check**, web production build, and with `--with-db` an API boot + `/api/health` smoke test against a throwaway database. Stops on first failure with a clear message naming the owning part. |
| `npm run contract:check` (`scripts/contract-check.mjs [--strict]`) | Loads the contract registry and the mounted routes. Reports every endpoint as implemented / `501 owned by part N`. Without `--strict`, unimplemented endpoints of parts not yet merged are allowed; with `--strict` (post-integration) every endpoint must be implemented. Also fails on duplicate IDs, paths without a schema, or handlers that are not in the contract. |
| `npm run contract:docs` | Regenerates `docs/CONTRACT.md` (endpoint table, DTO list, socket events, route table) from the code so docs never drift. |
| `npm run handoff -- --part N` (`scripts/handoff.mjs`) | Run on each part's device when done: runs `verify`, then writes `handoff/part-N.manifest.json` (part, branch, base and head commits, changed files with SHA-256, endpoints implemented, web routes and nav added, npm dependencies added, env vars added, migrations, known issues from `docs/handoff/part-N.md`) and creates `handoff/part-N.bundle` with `git bundle` (branch since the shared base). Copy these two files to the main device by USB/Drive/AirDrop. A normal git remote also works. |
| `npm run integrate -- --part N [--bundle handoff/part-N.bundle \| --remote <name>]` (`scripts/integrate.mjs`) | Run on the **main device**, on a clean `main`. Steps: tag `pre-integrate-N` → fetch the part's branch (from bundle or remote) → create `integration/part-N` from `main` → verify the manifest and that changed files are inside the part's ownership → `git merge --no-ff` with `scripts/merge-package-json.mjs` as the resolver for `package.json` files (union of dependencies, report version conflicts; never hand-merge `package-lock.json`: take main's and regenerate with `npm install`) → on any unresolved conflict **abort and print the conflicting files with their owners** → run `verify --with-db` → only if everything passes, fast-forward `main` to the integration branch and print the next step; otherwise delete the integration branch and leave `main` exactly as it was. |
| `npm run db:setup` | `prisma migrate deploy` + generate + run all seeds. `npm run dev` runs api and web together (`concurrently`). `npm run gen:secrets` prints fresh env secrets. |

## 9.3 Docs you write
- **`docs/INTEGRATION.md`** — the runbook for the main device: recommended merge order **1 → 2 → 3 → 4** (any order after 1 works because ownership is disjoint), exact commands per part (bundle and remote variants), what to do when `integrate` aborts, how to apply entries from `docs/schema-requests/` (only the integrator edits `schema.prisma`, adds one new migration, and runs `verify`), post-integration steps (`verify --strict --with-db`, `db:setup`, walk through `docs/DEMO_CHECKLIST.md`), and rollback (`git reset --hard pre-integrate-N`).
- **`docs/CONTRACT.md`** (generated), **`docs/DECISIONS.md`**, **`docs/DEVIATIONS.md`**, **`docs/handoff/part-1.md`** (what was built, endpoints implemented, env vars, known issues, how to run), and a **`README.md`** with the exact commands to run on a fresh machine: `docker compose up -d db` → `cp .env.example .env` → `npm i` → `npm run gen:secrets` → `npm run db:setup` → `npm run dev`.
- **`docs/PART_BRIEFS.md`**: for Parts 2, 3 and 4, a short note of what each must consume from Part 1 (module contract, guards, `defineRoute`, `api.call`, mocks, slots, design system, viz components, DTO/contract files they own, seed naming, ownership rules). The other agents' prompts will refer to it.

---

# 10. PHASES AND CHECKPOINTS

Work on `part/1-foundation`. After each phase: `npm run verify`, commit, update `docs/handoff/part-1.md`.

- **Phase A — Scaffold and contract** → tag **`cp0-scaffold`**. Monorepo, tooling, dev Docker Postgres, env validation, **complete `packages/shared`** (enums, errors, socket events, constants, time helpers with tests, all DTOs, all contract files with first-draft schemas), Prisma schema + migration + raw SQL + seed runner, API core (app factory, security, guards, crypto, mail, audit, settings, jobs, module loader, `defineRoute`, 501 stubs, dev bypass, `/api/health`), web core (Vite, Tailwind with final tokens, router builder, module loader, `api.call`, session, socket client, mocks, slots, `ModuleMissing`, 404), all scripts and `ownership.json`. Everything boots; `verify` passes.
- **Phase B — Design system, viz, shells, gallery** → merge `part/1-foundation` into `main` (fast-forward) and tag **`cp1-foundation`**. **This is the checkpoint the other three devices start from** (they branch from `main` at this tag). Include `docs/PART_BRIEFS.md` and a screenshot of the gallery. After this tag, treat `packages/shared` enums/tokens/design-system component APIs as **frozen** (additive changes only, logged).
- **Phase C — Auth** (backend + web, all screens, tests).
- **Phase D — Admin, clubs, meta** (backend + web, all screens, tests).
- **Phase E — Hardening and handoff** → tag **`part1-done`**: full test pass, accessibility pass (labels, focus, contrast), responsive pass at 390 and 1440 on every page, security review against Section 2.8, regenerate `docs/CONTRACT.md`, finish `INTEGRATION.md`, run `npm run handoff -- --part 1`.

---

# 11. DEFINITION OF DONE (self-check before you finish)

- [ ] `docker compose up -d db && npm run db:setup && npm run dev` works from a clean clone; `/api/health` is OK.
- [ ] `npm run verify --with-db` passes; `contract:check` lists Parts 2 and 4 endpoints as `501 owned by part N`.
- [ ] Register (student and organizer) → OTP → login → logout → forgot/reset all work end to end (OTP visible in the terminal via `ConsoleMailer` in dev); locked/expired/invalid OTP states are handled.
- [ ] Admin can approve an organizer to specific clubs; the organizer then lands on `/organizer` (shows `ModuleMissing` for now). A pending organizer lands on `/auth/pending`.
- [ ] Admin demo-mode switch changes `GET /api/auth/me → settings.confirmWindow…` live.
- [ ] USN and phone are never stored or logged in plaintext; verified in the database and in logs.
- [ ] A student cannot call admin or organizer endpoints; an organizer cannot touch another club (tests prove it).
- [ ] Prod config refuses `DEV_AUTH_BYPASS=true` (test proves it).
- [ ] `/dev/design` shows every component in all states; no hex colors or arbitrary Tailwind values outside `design-system/` (design lint passes); no gradients, emoji icons, glass or green dots anywhere.
- [ ] Every page checked at 390×844 and 1440×900 with no overflow, misalignment or inconsistent spacing; keyboard and screen-reader basics pass.
- [ ] `docs/` complete; `npm run handoff -- --part 1` produces the manifest and bundle; `docs/DEVIATIONS.md` lists every deviation, including the schema additions (`Session`, `OtpCode`, `Setting`, `usnHash`), the tooling additions, the organizer-approval modeling, the `EMAIL_TAKEN` trade-off, the Bricolage Grotesque pick, and the `cancelCutoffMinutes` setting.

**Begin with the plan, then Phase A. Do not ask questions. Do not skip the integration tooling: it is as important as the features.**
