import axios from 'axios';
import { env } from '@/app/config/env';
import { setupInterceptors } from './interceptors';

/**
 * Shared HTTP client.
 *
 * withCredentials is REQUIRED: the backend rotates refresh tokens via an
 * httpOnly, signed `__Host-refresh_token` cookie (see pulse auth routes.ts).
 * The browser manages that cookie automatically; we never read it in JS.
 */
export const apiClient = axios.create({
  baseURL: env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: env.VITE_API_TIMEOUT,
  withCredentials: true,
});

setupInterceptors(apiClient);
