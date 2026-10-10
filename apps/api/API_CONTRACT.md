# Part 1 API Contract

## Public / Student
- **GET /api/home**: Live, today, and upcoming event cards with capacity and counts.
- **GET /api/events**: List events with filters (status, clubId, search, cursor).
- **GET /api/events/:id**: Detailed event info, eligible status, registration info.
- **GET /api/clubs**: List active clubs.
- **GET /api/clubs/:id**: Club details and events.
- **GET /api/venues**: List venues.
- **POST /api/events/:id/register**: Register for an event. Body: `{ preferred?: boolean }`.
- **POST /api/events/:id/waitlist**: Waitlist for an event. Body: `{ preferred: true }`.
- **POST /api/events/:id/swap**: Swap seats. Body: `{ releaseRegistrationId: UUID }`.
- **DELETE /api/registrations/:id**: Cancel a registration.
- **POST /api/registrations/:id/confirm-promotion**: Confirm a seat offer. Body: `{ releaseRegistrationId?: UUID }`.
- **POST /api/registrations/:id/decline-promotion**: Pass on a seat offer.
- **GET /api/me/registrations**: List user's active registrations.

## Organizer / Admin
- **POST /api/events**: Create an event.
- **PATCH /api/events/:id**: Update an event.
- **POST /api/events/:id/cancel**: Cancel an event.
- **GET /api/events/:id/registrations**: List participants.
- **DELETE /api/events/:id/registrations/:regId**: Remove a participant.
- **PATCH /api/registrations/:id/status**: Update participation (ATTENDED / NO_SHOW).
- **GET /api/venues/availability**: Check venue clashes.
- **GET /api/settings/demo-mode**: Get demo mode status.
- **PUT /api/settings/demo-mode**: Enable/disable demo mode (Admin only).

## Stubs Implemented for other parts:
- **Auth**: `requireAuth`, `requireRole`, `devAuthMiddleware` in `src/integrations/auth.ts`.
- **Email**: `sendEmail` in `src/integrations/email.ts`.
- **Crypto**: `encryptField`, `decryptField` in `src/integrations/crypto.ts`.
- **QR**: `issueQrPass` in `src/integrations/qr.ts`.
