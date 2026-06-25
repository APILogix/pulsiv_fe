import { z } from 'zod';

/**
 * Frontend environment.
 *
 * The backend (pulse/) is a Fastify server with NO global /api prefix — auth is
 * mounted directly at /auth. So the API base URL is the bare origin, e.g.
 * http://localhost:3000. The refresh token lives in an httpOnly cookie set by
 * the backend, so all requests must be sent with credentials (see axios.ts).
 */
const envSchema = z.object({
  VITE_API_URL: z
    .string()
    .url()
    .default('http://127.0.0.1:5000'),
  VITE_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  VITE_API_TIMEOUT: z.coerce.number().int().positive().default(15000),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
