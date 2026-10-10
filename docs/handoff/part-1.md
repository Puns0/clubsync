# Handoff: Part 1 Foundation

## Done
1. **Monorepo setup**: Root TS config, Vite web app, Express/Prisma API, and shared types package.
2. **Design System Engine**: Tailwind config (`tailwind.config.ts`) explicitly forbidding gradients/glassmorphism and locking in the Paper/Ink/Vermilion palette and Ticket-style card borders.
3. **Core API Infra**: Pino logger, Central error handler (`AppError`), Auth Guards (`guards.ts`), Config validation (`config.ts`), and the Module loader (`module.ts`).
4. **Security Engine**: AES-256-GCM for USN/phone (`crypto.ts`), Session cookie sliding expiry, CSRF double-submit mechanism, and Login Lockout / OTP logic.
5. **Contract System**: Complete Zod schemas for Part 1 (`auth.ts`, `admin.ts`, `clubs.ts`) and first-draft DTOs and 501 stubs for Parts 2 and 4 (`p2.ts`, `p4.ts`).
6. **Prisma Schema**: Full schema covering all 4 parts, avoiding nested loops via careful indexing and JSON meta fields where appropriate.

## To Be Done (by you, Part 1 owner, if you continue, or next person)
- Spin up `docker compose up -d` on a machine with Docker to test the DB.
- Run `npm run gen:secrets` and put them in `.env`.
- Run `npm run db:setup` to push Prisma schema and run seeds.
- Start dev server `npm run dev`.

## Contracts (For other parts)
- **Part 2 (Engine)**: Look at `packages/shared/src/contract/p2.ts`. Your routes are scaffolded to return 501. Implement them in `apps/api/src/modules/events/` and `registrations/`.
- **Part 4 (Planning)**: Look at `packages/shared/src/contract/p4.ts`. Implement in `apps/api/src/modules/timetable/` and `analytics/`.
- **Part 3 (Student PWA)**: You can start building against `api.call('events.feed', ...)` because the types exist and it will safely return 501 until Part 2 finishes. Use the Design System components in `apps/web/src/design-system`.
