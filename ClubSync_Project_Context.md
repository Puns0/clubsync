# ClubSync — Full Project Context

> **Purpose of this file.** A complete, single-source record of everything decided, proposed, and still open for the ClubSync hackathon project (Team CLEVERFYRE, Problem Statement 37). It is written for two readers: the team (to stay aligned) and any AI assistant (to be fully briefed without re-asking). Paste it at the start of a new AI conversation.
>
> **Snapshot date:** 10 October 2026. State reflects the end of the idea/design phase, with the idea PPT already generated and the build not yet started.
>
> **How to read status tags used below**
> - **[LOCKED]** the user explicitly chose or approved it.
> - **[ACCEPTED]** proposed by the AI, and the user said the ideas were good / agreed (not individually confirmed).
> - **[PROPOSED]** suggested by the AI, awaiting a decision.
> - **[AI-CHOSEN]** a concrete pick made by the AI to fill a gap (for example a specific library). The user has not objected, but should confirm.
> - **[STRETCH]** only if time remains.
> - **[PENDING]** a decision or action that is still open.

---

## 1. Event and team facts

| Item | Value |
|---|---|
| Event | CBC 2.0 Hackathon, **Design Round** (idea PPT stage), followed by a build phase |
| Problem Statement ID | **PS-37** |
| Problem title | **College Club Activity Management** |
| Domain | **Software & Web Development** |
| Team name | **CLEVERFYRE** |
| Team ID | **CBC 053** |
| Team leader | **Puneet Gangur** |
| Panel name | **Kavana** |
| College | **SJB Institute of Technology** |
| Team size | **4** (stated by the user) |
| Build time | **24 hours** |
| Idea PPT deadline | About 2 hours from the time the user first mentioned it; at the last update about 1 hour was remaining when the idea was declared final |
| Project name | **ClubSync** [LOCKED, "Keep it"] |
| Tagline | **"one calendar, zero clashes"** |

**Ambiguity to resolve:** when asked about each team member's strengths, the user answered only "I am". The AI interpreted this as the user being the main builder. This is unconfirmed. The deck's feasibility wording was changed so it does not depend on team size.

---

## 2. The problem statement (as given by the organizers)

> Wording reproduced from the photographed sheet. The deck pastes it on slide 2.

**PROBLEM STATEMENT 37: College Club Activity Management**

- **Problem:** Students participate in multiple clubs and activities, making it difficult to manage event schedules, registrations, limited seats, and participation conflicts.
- **Objective:** Build a platform for managing club activities while preventing registration and schedule conflicts.
- **Workflow:**
  1. Club creates an activity with capacity and schedule.
  2. Students view and register for activities.
  3. System checks capacity and conflicting registrations.
  4. Full activities use a waitlist.
  5. Club updates participation status.
- **Key Requirements:**
  - Club and activity management.
  - Student registration.
  - Capacity and waitlist handling.
  - Schedule conflict detection.
  - Participation tracking.
- **Edge Cases:**
  - Activity reaches capacity.
  - Student registers for overlapping activities.
  - Student cancels and releases a seat.
- **Scope:**
  - **Must have:** Activity creation, registration, capacity, waitlist, and conflict handling.
  - **Stretch:** Participation recommendations or activity analytics.
- **Demo:** Create activities with limited capacity, register students, demonstrate conflicts and waitlist promotion.

### 2.1 Requirement-to-feature map

| Requirement | Where ClubSync covers it |
|---|---|
| Club and activity management | Organizer console, club profiles, event creation with seats, time, venue, eligibility |
| Student registration | Registration flow with seat, clash, and eligibility checks in one locked transaction |
| Capacity and waitlist handling | Live seat visuals, waitlist queue, smart promotion, confirm-or-release window |
| Schedule conflict detection | Clash blocking rule, swap suggestions, venue clash check, (proposed) timetable slot finder |
| Participation tracking | QR passes, scan-based check-in, attended / no-show marking |
| Edge: capacity reached | Automatic waitlist with visible position |
| Edge: overlapping activities | Block on overlap, with waitlist exception (see section 5) |
| Edge: cancel releases seat | Auto-promotion of the next eligible, free student |
| Stretch: recommendations / analytics | Fill rate, no-show rate, co-attendance recommendations (kept for later) |

---

## 3. How the user wants the AI to work (collaboration preferences)

These come from the user's saved preferences and from explicit statements during the conversation.

- **Do not create `.docx` files** unless explicitly told to.
- **Detail only when asked.** Keep answers short, do not repeat things, give complete detail only on request. Reason: the user does not want to hit a usage rate limit before the work is done.
- **Give suggestions**, especially ones that add real value or are a better approach to what is being built.
- **Brainstorm well. Do not be a yes-man.** If something is not the best opinion or approach, say so and suggest an alternative.
- **Prefers complete file deliverables** over incremental snippets.
- **Flag deviations from the spec explicitly** rather than silently implementing them.
- **Do not build things early.** The user was annoyed when the PPT was generated before the idea was finalized. Wait for the explicit go-ahead.
- **Never include "24 hours" in the feasibility sentence** (the user reacted strongly to this). See section 14.
- **Do not invent statistics.** The template requires a source for every stat or image.
- Questions should be batched when possible (the user asked for all open choices in one go, to be answered in order).

---

## 4. Product concept

**One-line idea (as on the deck):** We help students and clubs run clash-free events by validating seats, schedule and eligibility at registration, unlike forms and spreadsheets.

**Positioning.** The problem statement is a fairly simple CRUD app on the surface. The AI's framing, which the user accepted: treat it as a **scheduling and fairness engine**, not a CRUD app, because judges will see many CRUD apps. The user added that because the app is simple, **user experience and UI quality are the main focus.**

**What makes it different**
- A clash-aware waitlist that promotes only students who are free and eligible.
- Live, animated visualizations of seats, waitlists, clashes, and confirm windows.
- Concurrency-safe seat locking, demonstrable with a load test.
- A polished mobile-first student experience and a desktop-first organizer experience.
- (Proposed) A timetable-aware slot finder that also drafts permission paperwork when a clash with academics is unavoidable.

**Scale stance.** One college, one server. The user explicitly does **not** want load balancers or "industry scale" infrastructure, even though the organizers stressed industry demands and real-life scenarios. The AI's reply, which the user accepted: the real-life element to show is **correctness under concurrency** (seat races), not horizontal scaling. See section 12.

---

## 5. Core rules and logic (the heart of the product)

### 5.1 Clash rule [LOCKED, set by the user, then tightened by the AI]

**User's rule:** Do not let a participant register for a second event if it is at the same time as an event they already hold. **Exception:** they may register for the second event while they are still only on the *waitlist* of the first.

**Tightened version:**
- A **confirmed seat**, or a **promoted seat still inside its confirm window**, blocks any overlapping registration. The block screen still shows swap suggestions.
- A **waitlist spot does not block anything.** A student can be waitlisted on overlapping events, or confirmed on B while waitlisted on A.
- **When a student is promoted on A while holding B**, they see a choice: **"Confirm A (releases B) or pass on A."** If they confirm A, B's seat is released and B's waitlist advances automatically.
- **Preferred-event waitlist [LOCKED, "yes we are including that too"]:** a student who holds a seat in B can join A's waitlist as a "preferred event". It uses the same promotion choice, with no extra logic.
- **Overlap definition:** `startA < endB AND endA > startB`. Back-to-back events (one ends at 3:00, the next starts at 3:00) are **not** a clash.
- **Race condition:** two simultaneous registrations by the same student for overlapping events must not both succeed. Use a per-student lock inside the transaction (a Postgres advisory lock on the student ID).

### 5.2 Registration transaction

On Register, one database transaction does the following:
1. Lock the event row (`SELECT ... FOR UPDATE`) and take the student advisory lock.
2. Check eligibility (year / department rules).
3. Check for overlapping confirmed (or in-window promoted) registrations. If found, block and show swap suggestions.
4. If seats remain, create a confirmed registration and a QR pass.
5. If the event is full, add the student to the waitlist with a position.

### 5.3 Waitlist and smart promotion [LOCKED]

- When a seat frees up (cancel, expired confirm window, or organizer removal), the system **promotes the next student who is both eligible and free**.
- Students who now have a clash are **skipped, not blindly promoted**. The AI called this "smart promotion"; the user said it is good.
- Waitlist order is first-come, first-served, with the visible queue position shifting up live.

### 5.4 Confirm-or-release window [LOCKED]

- A promoted student gets a **30-minute window** to confirm (default).
- A **demo mode** shortens it to **60 seconds** so it can be shown live.
- If they do not confirm in time, the seat **moves to the next eligible student**.
- **Implementation note [PROPOSED by AI, accepted in spirit]:** drive timers from an `expires_at` column and a worker (node-cron), not in-memory timers, so a server restart does not lose them.
- **Notification channels:** the **in-app live notification (countdown ring)** is primary because email is slow for a 30-minute window; **email via Resend** is the backup.

### 5.5 Conflict suggestions [LOCKED, "good"]

When a clash blocks registration, the screen shows something like "conflicts with X. Swap, or join the waitlist for Y?".

### 5.6 Eligibility rules [LOCKED, "yes"]

Organizers can restrict an event to certain **years** and **departments**. This makes the clash and waitlist logic feel more real, and it feeds the proposed slot finder (the eligible audience defines which timetables to check).

### 5.7 Venue clash detection [ACCEPTED]

Stops two clubs from double-booking the same room. The problem statement does not require it, but it fits naturally. It also appears in the organizer's create-event flow as a live check.

### 5.8 QR passes and check-in [LOCKED]

- A **unique QR code is generated for each participant** (per event registration).
- QR tokens are **signed (HMAC), single-use, and tied to one participant and one event.**
- The organizer scans on their phone at the door; scanning marks attendance. No-shows are tracked.
- A "no-show penalty" feeding back into the system was floated by the AI as a possible extension. It was not individually decided.

### 5.9 WhatsApp links [ACCEPTED]

The user said clubs mostly use WhatsApp for quick announcements, which is why **phone number is collected.** The AI suggested a **"message participant" `wa.me` deep link** for organizers. This needs no WhatsApp API.

### 5.10 Personal timeline and calendar export [ACCEPTED, not individually confirmed]

A calendar view of the student's own events with clashes highlighted, plus `.ics` export. It was listed in the AI's first feature list, and the user said the ideas were good.

---

## 6. Accounts, roles, and registration

### 6.1 One app, role-based [LOCKED]

The user said the student and organizer/admin sides do not need to be separate apps: **one codebase with different logins** is fine. The student side is **mobile-first**; the organizer/admin side is **best on PC** while still good on mobile.

| Role | Access |
|---|---|
| **Student** | Browse the home feed, clubs, and events; register; see seats, waitlist position, schedule, and QR passes |
| **Club organizer** | After admin approval, **full access** to their assigned club: create events, set seats and eligibility, accept/manage participants, scan QR, mark attendance, manage the waitlist |
| **Admin** | **One admin panel.** Approves organizers and assigns them to **specific clubs**; manages users and venues |

### 6.2 Organizer approval [LOCKED]

Organizers sign up, then the admin approves them to specific clubs. After approval they have full control over their club's events and participants. (The user chose this over creating organizer accounts manually.)

### 6.3 Student registration [LOCKED]

The user said account registration must **"work perfectly"**.

- Email + password **with OTP verification** of the college email. Google sign-in restricted to the college domain is a **[STRETCH]**; the user chose "go with it" on email+password primary.
- Password reset flow.
- Rate limits on login, OTP, and resend.

**Data collected:**
- Name
- College email
- **USN**
- Department
- Year
- **Phone number** (added at the user's request, for WhatsApp use)

**Field-level encryption [LOCKED]:** USN and phone are encrypted (AES-256-GCM). Suggested visibility rule from the AI: a student's phone is visible only to organizers of events that student registered for.

---

## 7. Screens and pages

### Student (mobile-first)
- **Home feed:** sections for **Live now**, **Today**, and **Upcoming**; club chips; search; easy navigation to each club and to events open for registration. Cards show a **live seat meter.** (The user asked for a homepage showing current, ongoing, and upcoming events with easy navigation to clubs and events open for registration.)
- **Club page.**
- **Event page:** the seat visual, a Register button, and the student's waitlist position.
- **My Schedule:** a timeline with clashes highlighted.
- **My Passes:** a QR ticket for each event.

### Organizer (desktop-first)
- **Dashboard.**
- **Create-event flow** with a live venue-clash check, seats, time, venue, and eligibility.
- **Event management:** live attendee list, waitlist, QR scanner, attended/no-show marking.
- **Club profile.**

### Admin
- Approve organizers and assign clubs; users; venues.

---

## 8. Visualization and UX direction

The user wants the **number of seats, the waitlist, and basically anything possible visualized**, and wants **all the killer features visualized in the app**, with **good, smooth, simple animations**.

### 8.1 Visual ideas agreed or proposed
- **Seats:** a grid of seat icons that fill in live.
- **Waitlist:** a visible queue with positions that shift up when someone cancels.
- **Confirm window:** a countdown ring.
- **Passes:** ticket-style cards with a perforated edge.
- **Clash:** a side-by-side overlap on the timeline, with swap suggestions.
- **Live counts:** counters that animate on change.
- **Week heatmap** (for the proposed slot finder): lighter shades for fewer clashes, in shades of the accent colour.

### 8.2 Look and feel [LOCKED]

- The user **forbids typical AI-model colour schemes** ("indigo, dark blue, showing green dot with services online and stuff like that"). **No AI slop.**
- **Chosen direction:** a **"campus noticeboard"** feel — **warm off-white, near-black ink, one hot accent in vermilion** ("Go with it, vermilion colour"), with ticket-style cards.
- **Typography:** a characterful font, **not Inter** (examples floated: Bricolage Grotesque or Familjen Grotesk from Google Fonts; not committed).
- **Avoid:** gradients, glassmorphism, emoji icons, stock shadcn styling, green "online" dots, purple/indigo/dark-blue schemes.
- **Components:** Tailwind with custom design tokens, plus unstyled **Radix UI** primitives for full control.
- **Motion:** **Framer Motion** layout animations and springs; subtle and simple.
- **Responsiveness:** student side mobile-first; organizer/admin desktop-first but also good on mobile.

---

## 9. Technology stack

> The user stressed that **changing the tech stack significantly during implementation will lose points**, so everything planned is listed here and on slide 6 of the deck.

### 9.1 Frontend
- **React 18**, **Vite**, **TypeScript** [LOCKED: "react + vite webapp", TypeScript "yes"]
- **React Router** [AI-CHOSEN]
- **TanStack Query** [AI-CHOSEN]
- **Tailwind CSS** [LOCKED direction; AI-recommended]
- **Radix UI** primitives [AI-CHOSEN]
- **Framer Motion** [AI-CHOSEN]
- **Installable PWA** [AI-CHOSEN]
- **QR scanner:** `react-qr-scanner` (the `@yudiel/react-qr-scanner` package) for the organizer's phone [AI-CHOSEN]

### 9.2 Backend
- **Node.js + Express + TypeScript** [LOCKED direction]
- **Socket.io** for live seat counts, waitlist, and promotions [LOCKED direction: the user wants live seat counts]
- **Zod** validation on every input [AI-CHOSEN]
- **argon2id** password hashing [LOCKED: "hash it"]
- **Helmet** and **rate limiting** (e.g. express-rate-limit) [AI-CHOSEN]
- **node-cron** promotion/expiry worker [AI-CHOSEN]
- **Resend** for email [LOCKED]
- **`qrcode`** library to generate passes [AI-CHOSEN]
- Shared TypeScript types / validation between frontend and backend [LOCKED: TypeScript "yes"]

### 9.3 Data and hosting
- **PostgreSQL 16** in Docker. Chosen because seat allocation needs real transactions and row locks. [AI recommendation; the user accepted]
- **Prisma ORM** [AI-CHOSEN over Drizzle; raw SQL used for `FOR UPDATE` and advisory locks]
- **Cookie sessions** (httpOnly, Secure, SameSite), not JWTs in localStorage [AI-CHOSEN]
- **AES-256-GCM** field encryption for USN and phone [LOCKED]
- **Docker Compose** [LOCKED: Docker]
- **Self-hosted on the user's local machine** [LOCKED] behind **Cloudflare Tunnel** [LOCKED], using the domain the user already owns. The point is to demonstrate that the app needs only ordinary web hosting plus a server for live seat counts.
- **No load balancers.** [LOCKED]

### 9.4 Design and tooling
- **Figma** for design [listed on the deck].
- **Testing:** the AI suggested a script firing **50 simultaneous registrations at a 10-seat event** and ending with exactly 10 seats taken. (Vitest or a plain Node script was floated; not committed.) [PROPOSED, but the deck's risk slide says "load-tested", so this should be done]

### 9.5 Proposed additions (not yet decided)
- **`@react-pdf/renderer`** for generating the permission-letter PDFs in the proposed slot-finder feature. [PROPOSED] It is React-native and needs no headless browser. Because the user does not want the stack to change mid-build, this must be decided now.

### 9.6 Alternatives discussed and rejected or parked
- **Form-to-email services** (Formspree-style) for notifications: **rejected** because they route users' data through a third party, which contradicts the security goal.
- **Gmail SMTP via Nodemailer:** the alternative to Resend (quicker setup, lower limits). The user chose Resend.
- **Supabase / Postgres hosting elsewhere:** dropped in favour of self-hosted Postgres.
- **Google sign-in:** stretch only.
- **Drizzle ORM:** not chosen (Prisma used).
- **Cloudflare Access** in front of admin routes: mentioned as optional hardening, not decided.

---

## 10. Security (the user: "top notch, no compromises — hash it, encrypt it, I don't care")

The AI's guidance: "no compromises" is a good goal, but keep the claims honest. Say the project **follows these standards**, not that it is "unbreakable."

- **Passwords:** hashed with **argon2id**. Never encrypted, never stored in plain form.
- **Sessions:** httpOnly, Secure, SameSite cookies, not JWTs in localStorage. Add **CSRF protection.**
- **Request hardening:** rate limits on login, OTP, and resend; **Helmet**; **Zod** validation on every input; parameterized queries (ORM / prepared statements).
- **Registration:** OTP verification of the college email; password reset flow.
- **Authorization:** role and ownership checks **on the server**, so an organizer can only touch their own club; students cannot reach organizer or admin routes.
- **QR tokens:** signed (HMAC), single-use, tied to one participant and one event.
- **Data minimization:** collect only name, email, USN, department, year, phone. Anything not stored cannot leak.
- **Field-level encryption:** USN and phone in **AES-256-GCM** (the user accepted this).
- **Phone visibility:** only to organizers of events the student registered for (AI suggestion).
- **Network:** Postgres bound to localhost only; **no open ports**, because Cloudflare Tunnel is outbound-only; HTTPS via Cloudflare.
- **Audit log:** record admin and organizer actions.
- **Optional hardening:** Cloudflare Access in front of the admin panel (not decided).
- **Backups:** encrypted backups were mentioned in the AI's first pass; not specified further.

---

## 11. Email and notifications

- **Question the user asked:** can the confirm-or-lose notification be sent by email without running an email server, perhaps by abusing free online form-submission services?
- **Answer:** yes, it is possible without an email server, but **do not use form-to-email services** (they send users' data through a third party).
- **Chosen:** **Resend** (free tier, verify the user's domain). **Gmail SMTP via Nodemailer** is the fallback option.
- **Design:** **in-app live notification is the primary channel** (instant, with the countdown ring); **email is the backup**. Email is also used for OTP and verification.
- **Demo mode:** confirm window shortened to 60 seconds so the whole cycle can be shown live.

---

## 12. Hosting, deployment, and risks

- **Plan [LOCKED]:** Docker Compose on the user's own laptop, exposed with **Cloudflare Tunnel** on the user's domain. The message to judges: this app needs only normal web hosting plus one server for live seat counts.
- **No load balancers [LOCKED].** One college, one server. The deck's scalability story: one server serves a campus; the same schema extends to more clubs, departments and colleges.
- **Honest scale argument:** the real-life element is **correctness under concurrency**. The 50-simultaneous-registrations demo is the proof.
- **Laptop-hosting risks and mitigations (AI):**
  - Wi-Fi drop or sleep kills the demo → run the tunnel as a service (auto-restart), disable sleep.
  - Keep a **screen recording as a backup** for the demo.
  - Use a seed script so demo data is reproducible.
- **Portability:** because it is all in docker-compose, it can be deployed elsewhere with one command, which supports the "ordinary web hosting" story.

---

## 13. Proposed feature: timetable-aware slot finder and auto-drafted paperwork [PROPOSED]

**User's idea (verbatim in spirit):** Consider all semesters to find a good spot for the event that does not conflict with regular academics; and if it does conflict, the app should automatically draft a permission letter and other paperwork for management. "This can be a feature too."

**AI's evaluation:** a strong feature, the most real-world one so far, and a differentiator that Google Forms cannot match. It needs scoping.

**Proposed design**
1. **Timetable data:** the admin enters or imports a weekly grid per department, semester and section (day, period, subject). Also store **exam weeks and holidays.** For the demo, seed **2 or 3 sections** by hand.
2. **Slot finder:** when an organizer creates an event, score candidate slots against the event's **eligible audience** (year and department). Rank slots as "free for everyone", "free for most (X sections affected)", or "clashes with exams". Also check **venue availability.**
3. **Visual:** a **week heatmap** with the best slots highlighted; lighter shades mean fewer clashes. Use shades of the vermilion accent, not a generic traffic-light palette.
4. **Paperwork** (when the organizer picks a slot that still clashes), one click generates a **PDF draft** containing:
   - A **permission letter** to the HOD or Principal, auto-filled with club, event, date, time, venue, affected classes and periods, expected attendance, and faculty coordinator.
   - An **attendance-relaxation / OD list** of registered students, pulled from the registrations.

**AI's pushbacks on it**
- Do **not** scope to "all semesters"; scope to the event's eligible audience (less data entry, more accurate).
- The letter is a **draft, not an automatic submission.** The organizer reviews it and the faculty coordinator signs. The app must not claim approval it does not have.
- It needs **no AI**; a fixed template with filled fields is more reliable.
- **Tiering:** MVP = slot finder + PDF letter. Stretch = in-app approval workflow (HOD approves or rejects).

**Pending decisions:** whether to commit to `@react-pdf/renderer`; whether to include this feature in the build at all; whether to update the deck (slide 5's "Also included" line and slide 6's stack).

---

## 14. The idea PPT (deck) — status and contents

### 14.1 Template and rules
- **Template file:** `CBC2_0_Design_Round_Template.pptx` (9 slides).
- **Rules slide (slide 9) says:**
  1. Team ID and Domain must be identical on every slide (set once in the Slide Master footer, then match the title slide and the problem-statement slide).
  2. Use the template as given: keep theme, logo, and slide order.
  3. Paste the problem statement exactly as provided by the organizers.
  4. One message per slide, short points, **text no smaller than 14 pt.**
  5. Original work only; **cite the source for every stat or image.**
  6. Keep content inside the placeholders, no overflow or overlap.
  7. Submit as **PPTX and PDF named `TeamID_Domain`.**
- **Speaker-note timings** in the template: title 20 s, problem statement 30 s, understanding the problem 1 min, solution 1.5 min, features 1 min, architecture 1 min, differentiation 1 min, impact/feasibility/risks 1 min.

### 14.2 Delivered files
- `CBC053_Software-Web-Development.pptx`
- `CBC053_Software-Web-Development.pdf`

(The naming format is an AI interpretation of `TeamID_Domain`; change it if the organizers want something else.) The "Rules to Follow" slide was left in as slide 9, to be deleted only if the organizers say so.

### 14.3 Current slide text

**Slide 1 — Title.** "Design Round" / "ClubSync — one calendar, zero clashes". Team name CLEVERFYRE, Team ID CBC 053, Domain Software & Web Development, College SJB Institute of Technology.

**Slide 2 — Problem Statement.** Problem ID PS-37; the statement pasted as given; Domain Software & Web Development; Our focus: "Clash-free registration with fair, automatic waitlists".

**Slide 3 — Understanding the Problem.**
- *Who is affected:* students juggling several clubs and events; organizers running sign-ups by hand; faculty and admins overseeing many clubs.
- *What is going wrong:* overlapping events with no clash warning; full events with manual waitlists and ghost seats; forms, chats and sheets scattered per club.
- *Why it matters:* missed events, empty seats, unfair access; hours of organizer time lost on tracking; "Why now: campus events keep growing, tools have not."

**Slide 4 — Our Proposed Solution.** Idea: "We help students and clubs run clash-free events by validating seats, schedule and eligibility at registration, unlike forms and spreadsheets."
- Step 1 Input: organizer posts an event with seats, time, venue and eligibility; student registers.
- Step 2 Process: a locked transaction checks seats, clashes and eligibility, then confirms or waitlists.
- Step 3 Outcome: confirmed QR pass, or a live waitlist spot that auto-promotes when a seat frees.

**Slide 5 — Key Features (six cards + strip).**
1. Clash-proof registration: blocks overlapping seats with swap suggestions; waitlisting never blocks.
2. Live seat visuals: live seat map and waitlist queue; counts update instantly, no overbooking.
3. Smart waitlist: promotes the next student who is eligible and free; clashes are skipped.
4. Confirm-or-release: in-app countdown and email; unclaimed seats move on.
5. QR passes: unique signed pass per participant, scanned by organizers for live attendance.
6. Secure by design: argon2id passwords, encrypted phone and USN, signed QR, role-based access.
- *Also included strip:* live home feed · eligibility rules · venue clash check · preferred-event waitlist · WhatsApp links.

**Slide 6 — Architecture & Tech Stack.**
- *User layer:* React 18 · Vite · TypeScript · React Router · TanStack Query · Tailwind CSS · Radix UI · Framer Motion · installable PWA · QR scanner (react-qr-scanner).
- *Application layer:* Node.js · Express · TypeScript · Socket.io (live seats) · Zod validation · argon2id · Helmet · rate limiting · node-cron promotion worker · Resend email · qrcode.
- *Data & Hosting layer* (renamed from the template's "Data & AI layer" since there is no AI component): PostgreSQL 16 · Prisma ORM · cookie sessions · row and advisory locks · AES-256-GCM field encryption · Docker Compose · Cloudflare Tunnel (HTTPS, no open ports).
- *Tech stack card:* Design Figma; Frontend React + Vite + TS; Backend Node + Express + TS; Database PostgreSQL + Prisma; Hosting Docker + CF Tunnel.

**Slide 7 — Innovation & Differentiation.**

| Aspect | Existing solutions | Our solution |
|---|---|---|
| Ease of use | Separate forms and chat groups for every event | One portal: live home feed, one-tap registration |
| Cost / access | Paid platforms or scattered free forms | Free open-source stack on one ordinary server |
| Personalization | Same static list for everyone | Personal clash-free timeline and swap suggestions |
| Scalability | Manual checks break as clubs grow | Database-enforced seat rules, safe under simultaneous sign-ups |

Unique edge: "a clash-aware waitlist that promotes only students who are free".

**Slide 8 — Impact, Feasibility & Risks.**
- *Impact:* fewer clashes and empty seats for students; no manual list or waitlist work for organizers; fair, auditable access.
- *Feasibility (CURRENT TEXT — needs replacing, see 14.4):* "Proven open-source web stack; the core flow (seat locking, waitlist, clash check) fits the 24-hour build."
- *Scalability:* one server serves a campus; the same schema extends to more clubs, departments and colleges.
- *Risks & mitigation:* seat races: row locks and transactions, load-tested. Host outage: auto-restart plus demo backup.

**Slide 9 — Rules to Follow.** Template slide, left in.

### 14.4 Open deck items
- **Replace the feasibility sentence.** The user said **"DO NOT INCLUDE 24 HOURS"**. Options the AI offered (user has not picked one yet):
  - "Built entirely on free, open-source tools the team already works with, so the core flow (seat locking, waitlist, clash check) is fully buildable, testable and demo-ready."
  - "Every component is free, open-source and self-hostable, so ClubSync runs on one ordinary server with no paid services."
- The deck does **not** yet mention the slot finder / paperwork feature or the PDF library.
- "Load-tested" on slide 8 is a claim that must be true by demo time (the 50-simultaneous-registrations test).
- No statistics appear in the deck (the template requires sources for every stat). If the user has a real figure from their own college, it can be added to the impact slide with a source.

---

## 15. Demo plan

**Script (agreed):**
1. Create a **2-seat event.**
2. Register **3 students**; the third lands on the waitlist.
3. Register one student for an **overlapping event**; it is **blocked, with a suggestion.**
4. **Cancel a seat**; the waitlisted student is **promoted live on a second screen** (confirm countdown ring).

**Extra demo moments (proposed):**
- The **50-simultaneous-registrations test** on a 10-seat event ends with exactly 10 taken.
- Confirm-or-release in **60-second demo mode.**
- QR scan check-in on a phone.
- (If built) the **slot-finder heatmap and the generated permission letter.**

---

## 16. Build plan

**Order (AI proposal):**
1. Auth, schema, and the seat / waitlist / conflict transaction logic.
2. Student flow with the seat visuals.
3. Organizer tools plus QR.
4. Confirm window and email.
5. Polish and animation. Analytics **only if time remains.**

**Scope guards:**
- Do not over-invest in auth complexity beyond the agreed (email + OTP), payments, or a native mobile app. The effort goes into the demo and the UX.
- **Analytics** (fill rate, no-show rate, co-attendance "students who attended X also attended Y") and **recommendations** are **[STRETCH]**. The user: "analytics is also good, but let's keep it for later, if we have the time."

**Team split:** unresolved (see section 1).

---

## 17. Suggested data model (a starting sketch — NOT discussed or approved)

> Included only so a future AI or teammate has a concrete starting point. Treat it as a proposal.

- `users` (id, name, email, password_hash, role, usn_enc, phone_enc, department, year, email_verified_at)
- `clubs` (id, name, description)
- `club_organizers` (user_id, club_id, approved_by, approved_at)
- `venues` (id, name)
- `events` (id, club_id, title, description, venue_id, starts_at, ends_at, capacity, eligible_years, eligible_departments, status)
- `registrations` (id, event_id, user_id, status [confirmed | waitlisted | promoted_pending | cancelled | attended | no_show], waitlist_position, promoted_at, expires_at, qr_token_hash, created_at)
- `notifications` (id, user_id, type, payload, read_at)
- `audit_log` (id, actor_id, action, target, at)
- (Proposed feature) `timetable_slots` (department, semester, section, day, start, end, subject), `academic_calendar` (date range, type [exam | holiday]), `letters` (event_id, generated_at, file)
- Constraints/locking: `SELECT ... FOR UPDATE` on the event row; Postgres advisory lock keyed on the student id; indexes on `(event_id, status)` and `(user_id, starts_at)`.

---

## 18. Decision log (the user's answers, in order)

The AI batched its open questions; these are the user's answers.

| # | Question | Answer |
|---|---|---|
| 1 | Look | "Go with it, vermilion colour." |
| 2 | Registration | "Go with it" (email + password + OTP; Google sign-in as stretch) |
| 3 | Email sender | **Resend** |
| 4 | Confirm window | "Go with it" (30 min, with 60 s demo mode) |
| 5 | Organizer accounts | One admin panel; approve organizers to specific clubs; after approval they have full access to set up events and accept participants |
| 6 | Student data | "Get phone number too, as most clubs use WhatsApp for quick announcements" |
| 7 | Eligibility by year/department | Yes |
| 8 | TypeScript | Yes |
| 9 | Project name | Keep ClubSync |
| 10 | Team strengths | "I am" (ambiguous) |
| 11 | Timeline | 1 more hour; "this is the last of the idea, then we go with ppt" |

**Other decisions along the way**
- Clash rule: block overlapping registration when a seat is held; allow it while only waitlisted (section 5.1).
- Preferred-event waitlist: included.
- Final stack to be listed in full in the deck (changing it later loses points).
- Feasibility sentence must not mention 24 hours.
- Team ID **CBC 053**; college **SJB Institute of Technology**.

---

## 19. AI pushbacks made, with reasons (so they are not repeated)

1. **Treat it as a fairness engine, not CRUD.** Judges see many CRUD apps.
2. **Skip over-engineering:** payments, native mobile app, and heavy auth are not worth it.
3. **Form-to-email services are a bad fit** for a security-focused project; use Resend.
4. **In-app notification first, email second**, because email is too slow for a 30-minute window.
5. **Timers must live in the database** (`expires_at` + worker), not in memory.
6. **Postgres over lighter databases**, because waitlist races need atomic transactions.
7. **Hash passwords, do not "encrypt" them.**
8. **Keep security claims honest**, not "unbreakable."
9. **Laptop hosting is fragile** → run the tunnel as a service, disable sleep, keep a recording.
10. **Real-life credibility without load balancers** is concurrency correctness, shown with a load test.
11. **Close the clash-rule hole:** a student waitlisted on A who gets confirmed in B must get a choice when promoted on A.
12. **Scope the slot finder to the eligible audience**, not all semesters.
13. **Paperwork is a draft for signature**, not an automatic submission.

---

## 20. Open questions and pending actions

1. **Feasibility sentence:** pick a replacement and have the deck updated.
2. **Slot finder + paperwork:** include or not? If yes, commit to `@react-pdf/renderer` and decide whether to update slides 5 and 6.
3. **Team split:** who builds what (the user's answer "I am" was unclear).
4. **Stack confirmation:** confirm the AI-chosen libraries (Prisma, node-cron, react-qr-scanner, React Router, Radix UI, Zod, Helmet) so nothing changes mid-build.
5. **Font choice:** pick the actual typeface (not Inter).
6. **Deck file naming:** confirm `CBC053_Software-Web-Development` matches what the organizers expect.
7. **Slide 9:** keep or delete, depending on the organizers.
8. **Optional hardening:** Cloudflare Access for the admin panel.
9. **Google sign-in** (stretch) and **analytics / recommendations** (stretch).
10. **No-show penalty** feeding back into the system (floated, undecided).
11. **Real college data** for the impact slide, if any, with sources.

---

## 21. Chronology of the conversation (condensed)

1. The user shared a photo of **Problem Statement 37** and asked for the best solution, killer features, tech stack, and plan.
2. The AI proposed ClubSync: stack (React, Vite, Tailwind, Node/Express, Postgres, Socket.io), must-haves, killer features (smart promotion, confirm-or-release, conflict suggestions, personal timeline, venue clash, QR check-in, analytics stretch), a demo script, and a pushback against over-investing in auth, payments, or a mobile app.
3. The user liked it and shared **team size (4), 24 hours to build, and 2 hours for the idea PPT**, with the template attached. The AI read the template and **built a draft deck prematurely.** The user objected: the idea was still being discussed.
4. The user laid out detailed requirements: **UX is the main focus**, avoid AI-style colours, **React + Vite**, mobile-first student side and PC-first admin side (one app with separate logins acceptable), **host on a local machine behind Cloudflare Tunnel**, visualize seats and waitlists, smooth animations, **per-participant QR**, **email for the confirm window**, **homepage** of current/ongoing/upcoming events with navigation, **analytics later**, **account registration must work perfectly**, **no load balancers**, **top security**.
5. The AI produced the full overview (sections 4–12 above) and asked a registration question.
6. The user asked for all open questions in one batch; the AI listed 11. The user answered them (section 18).
7. The AI updated the deck to the final decisions and asked for **Team ID and college.**
8. The user refined the **clash rule**; the AI tightened it and suggested the **preferred-event waitlist**; the user included it.
9. The user supplied **Team ID CBC 053 and college SJB Institute of Technology** and asked for the finished PPT, with every stack item listed. The AI produced the final PPTX and PDF.
10. The user asked for a **better feasibility sentence** (not changing the deck); the AI offered two; the user objected that **24 hours must not appear**; the AI offered replacements without it.
11. The user proposed the **slot finder and auto-drafted paperwork** feature; the AI evaluated and tiered it.
12. The user asked for this **long context file.**

---

## 22. Glossary

- **Waitlist:** an ordered queue of students for a full event; holds no seat.
- **Promotion:** moving the next eligible, free student from the waitlist to a pending-confirm seat.
- **Confirm window:** the time a promoted student has to accept the seat before it moves on.
- **Smart promotion:** promotion that skips students who now have a clash.
- **Preferred-event waitlist:** joining the waitlist for a preferred event while holding a seat in an overlapping one.
- **Clash:** two events whose times overlap (`startA < endB AND endA > startB`).
- **OD list:** on-duty / attendance-relaxation list of students attending an event during class hours.
- **USN:** university seat number (student ID).
- **PWA:** progressive web app (installable web app).
- **CBC 2.0:** the hackathon; **Design Round** is the idea-submission stage.

---

*End of context file.*
