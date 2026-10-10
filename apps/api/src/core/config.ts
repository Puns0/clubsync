import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  APP_ORIGIN: z.string().url(),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  DATABASE_URL: z.string().min(1),
  FIELD_ENCRYPTION_KEY: z.string().min(1),
  OTP_SECRET: z.string().min(16),
  QR_HMAC_SECRET: z.string().min(16),
  CSRF_SECRET: z.string().min(16),
  USN_HASH_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('ClubSync <noreply@clubsync.local>'),
  ALLOWED_EMAIL_DOMAINS: z.string().default('sjbit.edu.in'),
  ALLOW_ANY_EMAIL_DOMAIN: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  TRUST_PROXY: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  WEB_DIST: z.string().optional(),
  DEV_AUTH_BYPASS: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().default('admin@clubsync.local'),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(10).default('Admin123456!'),
});

export type AppConfig = z.infer<typeof envSchema> & {
  allowedEmailDomains: string[];
  isProd: boolean;
  isDev: boolean;
  isTest: boolean;
};

export function loadConfig(): AppConfig {
  const parsed = envSchema.parse(process.env);

  // Safety: refuse to start in production with dev auth bypass
  if (parsed.NODE_ENV === 'production' && parsed.DEV_AUTH_BYPASS) {
    throw new Error(
      'FATAL: DEV_AUTH_BYPASS=true is not allowed in production. Remove it from your environment.',
    );
  }

  return {
    ...parsed,
    allowedEmailDomains: parsed.ALLOWED_EMAIL_DOMAINS.split(',').map((d) => d.trim().toLowerCase()),
    isProd: parsed.NODE_ENV === 'production',
    isDev: parsed.NODE_ENV === 'development',
    isTest: parsed.NODE_ENV === 'test',
  };
}
