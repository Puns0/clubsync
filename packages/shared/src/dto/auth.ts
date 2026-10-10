import { z } from 'zod';
import { DEPARTMENTS, YEARS, USN_REGEX, PHONE_REGEX, PASSWORD_RULES, OTP_RULES } from '../constants.js';

// ── Registration ─────────────────────────────────────────────────

export const RegisterBodySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z
    .string()
    .min(PASSWORD_RULES.MIN_LENGTH)
    .max(128)
    .refine((p) => PASSWORD_RULES.HAS_LETTER.test(p), 'Password must contain at least one letter')
    .refine((p) => PASSWORD_RULES.HAS_NUMBER.test(p), 'Password must contain at least one number'),
  usn: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => USN_REGEX.test(v), 'Invalid USN format'),
  department: z.enum(DEPARTMENTS as unknown as [string, ...string[]]),
  year: z.number().int().min(1).max(4),
  phone: z
    .string()
    .trim()
    .refine((v) => PHONE_REGEX.test(v), 'Phone must be +91 followed by 10 digits'),
  role: z.enum(['STUDENT', 'ORGANIZER']),
  organizerNote: z.string().max(500).optional(),
  requestedClubIds: z.array(z.string().uuid()).optional(),
});
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const RegisterResponseSchema = z.object({
  userId: z.string().uuid(),
  message: z.string(),
});

// ── OTP ──────────────────────────────────────────────────────────

export const VerifyOtpBodySchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  code: z.string().length(OTP_RULES.LENGTH),
  purpose: z.enum(['VERIFY_EMAIL', 'PASSWORD_RESET']),
});
export type VerifyOtpBody = z.infer<typeof VerifyOtpBodySchema>;

export const ResendOtpBodySchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  purpose: z.enum(['VERIFY_EMAIL', 'PASSWORD_RESET']),
});

// ── Login ────────────────────────────────────────────────────────

export const LoginBodySchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']),
    organizerStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']),
    emailVerified: z.boolean(),
  }),
});

// ── Password reset ───────────────────────────────────────────────

export const ForgotPasswordBodySchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const ResetPasswordBodySchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  code: z.string().length(OTP_RULES.LENGTH),
  newPassword: z
    .string()
    .min(PASSWORD_RULES.MIN_LENGTH)
    .max(128)
    .refine((p) => PASSWORD_RULES.HAS_LETTER.test(p), 'Password must contain at least one letter')
    .refine((p) => PASSWORD_RULES.HAS_NUMBER.test(p), 'Password must contain at least one number'),
});

// ── Me ───────────────────────────────────────────────────────────

export const UserDTOSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  usn: z.string().optional(),
  department: z.string(),
  year: z.number(),
  phone: z.string().optional(),
  role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']),
  organizerStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']),
  emailVerified: z.boolean(),
  organizerClubIds: z.array(z.string().uuid()),
});
export type UserDTO = z.infer<typeof UserDTOSchema>;

export const SettingsDTOSchema = z.object({
  demoMode: z.boolean(),
  confirmWindowMinutes: z.number(),
  demoConfirmWindowSeconds: z.number(),
  cancelCutoffMinutes: z.number(),
});
export type SettingsDTO = z.infer<typeof SettingsDTOSchema>;

export const MeResponseSchema = z.object({
  user: UserDTOSchema.nullable(),
  csrfToken: z.string(),
  serverTime: z.string(),
  settings: SettingsDTOSchema.nullable(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const UpdateProfileBodySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  department: z.enum(DEPARTMENTS as unknown as [string, ...string[]]).optional(),
  year: z.number().int().min(1).max(4).optional(),
  phone: z
    .string()
    .trim()
    .refine((v) => PHONE_REGEX.test(v), 'Phone must be +91 followed by 10 digits')
    .optional(),
});

export const ChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(PASSWORD_RULES.MIN_LENGTH)
    .max(128)
    .refine((p) => PASSWORD_RULES.HAS_LETTER.test(p), 'Password must contain at least one letter')
    .refine((p) => PASSWORD_RULES.HAS_NUMBER.test(p), 'Password must contain at least one number'),
});
