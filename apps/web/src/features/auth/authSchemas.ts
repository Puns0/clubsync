// ─── Auth Schemas ───
// Zod schemas for all authentication forms.

import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").endsWith("@sjbit.edu.in", "Must use college email (@sjbit.edu.in)"),
  usn: z.string().regex(/^[1-4][A-Z]{2}\d{2}[A-Z]{2}\d{3}$/i, "Invalid USN format (e.g., 1SJ22CS089)"),
  department: z.string().min(1, "Department is required"),
  year: z.coerce.number().min(1, "Year must be 1-4").max(4, "Year must be 1-4"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Must contain at least one uppercase letter").regex(/[0-9]/, "Must contain at least one number"),
});
export type SignupFormData = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
