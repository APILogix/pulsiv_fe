import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { ApiError } from './api-error';
import { presentApiErrorToast } from './toast-error-handler';
import { useAuthStore } from '@/modules/auth/store/auth.store';

export function normalizeAxiosError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 500;
    const responseData = error.response?.data;
    
    // Parse canonical error envelope if present
    if (responseData && typeof responseData === 'object' && 'error' in responseData) {
      const backendErr = (responseData as any).error;
      const code = backendErr?.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');
      const message = backendErr?.message || error.message || 'Request failed';
      const details = backendErr?.details || null;
      const requestId = (responseData as any).requestId || (error.response?.headers?.['x-request-id'] as string);

      return new ApiError(status, code, message, details, requestId);
    }

    // Network & Timeout failures
    if (error.code === 'ERR_NETWORK') {
      return new ApiError(503, 'SERVICE_UNAVAILABLE', 'Unable to reach the server. Please check your network connection.');
    }
    if (error.code === 'ECONNABORTED') {
      return new ApiError(504, 'UPSTREAM_TIMEOUT', 'Request timed out. Please try again.');
    }

    const message = error.message || 'An unexpected error occurred.';
    return new ApiError(status, 'INTERNAL_ERROR', message, null, error.response?.headers?.['x-request-id'] as string);
  }

  return new ApiError(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'An unexpected error occurred.');
}

/**
 * Extract human-readable error message from ApiError, Axios error, or generic Error instance.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!error) return 'An unexpected error occurred.';

  if (error instanceof ApiError) {
    return error.message;
  }

  const normalized = normalizeAxiosError(error);
  return normalized.message || 'An unexpected error occurred.';
}

/**
 * Extract error code string from ApiError, Axios error, or generic Error instance.
 */
export function getErrorCode(error: unknown): string {
  if (!error) return 'UNKNOWN';

  if (error instanceof ApiError) {
    return error.code;
  }

  const normalized = normalizeAxiosError(error);
  return normalized.code || 'UNKNOWN';
}

/**
 * Global Error Interceptor — maps all backend error responses to ApiError
 * and triggers toast notifications. Handles step-up 403 challenge re-tries.
 */
export function createErrorInterceptor(client: AxiosInstance) {
  return async function errorInterceptor(error: AxiosError) {
    const apiError = normalizeAxiosError(error);

    // 403 STEP_UP_REQUIRED handling
    if (apiError.status === 403 && apiError.code === 'STEP_UP_REQUIRED' && error.config) {
      try {
        const { triggerStepUp } = useAuthStore.getState();
        await triggerStepUp();
        return client.request(error.config);
      } catch {
        // Step-up cancelled/failed
      }
    }

    // Present toast notification (skip for silent requests if config specifies skipToast)
    const skipToast = (error.config as any)?.skipToast === true;
    if (!skipToast) {
      presentApiErrorToast(apiError);
    }

    return Promise.reject(apiError);
  };
}
