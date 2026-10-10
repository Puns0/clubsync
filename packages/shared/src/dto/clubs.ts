import { z } from 'zod';

// ── Clubs ────────────────────────────────────────────────────────

export const ClubDTOSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  organizerCount: z.number().optional(),
  upcomingEventCount: z.number().optional(),
});
export type ClubDTO = z.infer<typeof ClubDTOSchema>;

export const CreateClubBodySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(1000).trim().default(''),
});

export const UpdateClubBodySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
});

// ── Venues ───────────────────────────────────────────────────────

export const VenueDTOSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
export type VenueDTO = z.infer<typeof VenueDTOSchema>;

export const CreateVenueBodySchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export const UpdateVenueBodySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
});
