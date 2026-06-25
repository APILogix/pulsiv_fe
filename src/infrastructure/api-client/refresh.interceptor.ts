import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenService } from '@/modules/auth/services/token.service';

/**
 * 401 → refresh → retry interceptor.
 *
 * When any authenticated request gets a 401, we call POST /auth/sessions/refresh.
 * The refresh JWT lives in an httpOnly cookie (`__Host-refresh_token`) so the
 * browser sends it automatically (axios `withCredentials: true`).  We never read
 * or store the refresh token in JS.
 *
 * Concurrent 401s during an in-flight refresh are queued and replayed once the
 * refresh resolves.  If refresh fails we clear tokens and redirect to /auth/login.
 */

const REFRESH_ENDPOINT = '/auth/sessions/refresh';
const LOGIN_ENDPOINTS = ['/auth/login', '/auth/login/mfa', '/auth/login/backup-code'];

let isRefreshing = false;
let queuedRequests: Array<{
  resolve: (config: InternalAxiosRequestConfig) => void;
  reject: (error: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

function isRefreshableRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config) return false;
  const url = config.url ?? '';
  if (url.includes(REFRESH_ENDPOINT)) return false;
  if (LOGIN_ENDPOINTS.some((ep) => url.includes(ep))) return false;
  return true;
}

function flushQueue(error: unknown | null): void {
  queuedRequests.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      const token = tokenService.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      resolve(config);
    }
  });
  queuedRequests = [];
}

export function attachRefreshInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        !isRefreshableRequest(originalRequest)
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queuedRequests.push({
            resolve,
            reject,
            config: originalRequest,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await client.post(REFRESH_ENDPOINT);
        const data = refreshResponse.data?.data;
        if (data?.access_token) {
          tokenService.setAccessToken(data.access_token, data.expires_at);
        }
        isRefreshing = false;
        flushQueue(null);

        const token = tokenService.getAccessToken();
        if (token && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return client(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        flushQueue(refreshError);
        tokenService.clearTokens();

        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    },
  );
}
