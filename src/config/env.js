import 'dotenv/config';
import { z } from 'zod';

const bool = (def) =>
  z.enum(['true', 'false']).default(def).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.string().min(1).default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().positive().default(7),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOCK_TIME_MINUTES: z.coerce.number().positive().default(15),
  REQUIRE_EMAIL_VERIFICATION: bool('true'),
  RETURN_REFRESH_TOKEN_IN_BODY: bool('false'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Auth App <no-reply@example.com>'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  clientOrigins: parsed.data.CLIENT_URL.split(',').map((s) => s.trim()),
  clientUrl: parsed.data.CLIENT_URL.split(',')[0].trim().replace(/\/$/, ''),
};
