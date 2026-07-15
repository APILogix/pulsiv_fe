import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/modules/auth/store/auth.store';
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
let signedOutToastShown = false;
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

function handleRefreshSessionExpired(): void {
  tokenService.clearTokens();
  useAuthStore.getState().clearAuth();

  if (!signedOutToastShown) {
    signedOutToastShown = true;
    toast.error('Signed off', {
      description: 'Your session expired. Please sign in again.',
    });
    window.setTimeout(() => {
      signedOutToastShown = false;
    }, 5000);
  }

  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
    window.location.href = '/auth/login';
  }
}

export function attachRefreshInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;
      const originalUrl = originalRequest?.url ?? '';

      if (error.response?.status === 401 && originalUrl.includes(REFRESH_ENDPOINT)) {
        isRefreshing = false;
        flushQueue(error);
        handleRefreshSessionExpired();
        return Promise.reject(error);
      }

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
          tokenService.setCurrentOrgId(data.current_org_id);
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
        handleRefreshSessionExpired();
        return Promise.reject(refreshError);
      }
    },
  );
}
