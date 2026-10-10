import { z } from 'zod';
import { UserDTOSchema, SettingsDTOSchema } from './auth.js';
import { ClubDTOSchema, VenueDTOSchema } from './clubs.js';
import { DEPARTMENTS } from '../constants.js';

// ── Admin Stats ──────────────────────────────────────────────────

export const AdminStatsDTOSchema = z.object({
  totalStudents: z.number(),
  totalOrganizers: z.number(),
  totalAdmins: z.number(),
  totalClubs: z.number(),
  totalVenues: z.number(),
  pendingOrganizerRequests: z.number(),
  totalEvents: z.number(),
});
export type AdminStatsDTO = z.infer<typeof AdminStatsDTOSchema>;

// ── Organizer Requests ───────────────────────────────────────────

export const OrganizerRequestDTOSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  year: z.number(),
  organizerStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']),
  organizerNote: z.string().nullable(),
  requestedClubIds: z.array(z.string().uuid()),
  assignedClubIds: z.array(z.string().uuid()),
  assignedClubs: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  createdAt: z.string(),
});
export type OrganizerRequestDTO = z.infer<typeof OrganizerRequestDTOSchema>;

export const ApproveOrganizerBodySchema = z.object({
  clubIds: z.array(z.string().uuid()).min(1, 'At least one club must be assigned'),
});

export const RejectOrganizerBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

// ── Admin Club Organizer Management ──────────────────────────────

export const AddOrganizerToClubBodySchema = z.object({
  userId: z.string().uuid(),
});

// ── Admin User Management ────────────────────────────────────────

export const AdminUserDTOSchema = UserDTOSchema.extend({
  disabledAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminUserDTO = z.infer<typeof AdminUserDTOSchema>;

export const AdminUpdateUserBodySchema = z.object({
  disabled: z.boolean().optional(),
});

export const AdminUserListQuerySchema = z.object({
  query: z.string().optional(),
  role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Admin Settings ───────────────────────────────────────────────

export const UpdateSettingsBodySchema = z.object({
  demoMode: z.boolean().optional(),
  confirmWindowMinutes: z.number().int().min(1).max(240).optional(),
  demoConfirmWindowSeconds: z.number().int().min(10).max(600).optional(),
  cancelCutoffMinutes: z.number().int().min(0).max(1440).optional(),
});

// ── Audit Log ────────────────────────────────────────────────────

export const AuditLogDTOSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  actorName: z.string().nullable(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  meta: z.unknown(),
  ip: z.string().nullable(),
  at: z.string(),
});
export type AuditLogDTO = z.infer<typeof AuditLogDTOSchema>;

export const AuditLogQuerySchema = z.object({
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Meta (public) ────────────────────────────────────────────────

export const MetaPublicDTOSchema = z.object({
  departments: z.array(z.string()),
  years: z.array(z.number()),
  clubs: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  allowedEmailDomains: z.array(z.string()),
  usnHint: z.string(),
});
export type MetaPublicDTO = z.infer<typeof MetaPublicDTOSchema>;
