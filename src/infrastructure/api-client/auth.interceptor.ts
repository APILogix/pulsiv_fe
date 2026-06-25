import type { InternalAxiosRequestConfig } from 'axios';
import { tokenService } from '@/modules/auth/services/token.service';

export function authInterceptor(config: InternalAxiosRequestConfig) {
  const token = tokenService.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}
