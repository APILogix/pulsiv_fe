import type { InternalAxiosRequestConfig } from 'axios';
import { tokenService } from '@/modules/auth/services/token.service';

export function authInterceptor(config: InternalAxiosRequestConfig) {
  // Refresh is authenticated by an httpOnly cookie, not the bearer token.
  // Mark it as an intentional SPA request so the API can reject cross-site
  // form posts that would otherwise carry the cookie.
  if ((config.url ?? '').split('?')[0].endsWith('/auth/sessions/refresh')) {
    config.headers.set('X-CSRF-Request', '1');
  }

  const token = tokenService.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}
