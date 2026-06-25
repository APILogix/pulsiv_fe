import type { AxiosError } from 'axios';

/**
 * Retry interceptor — retries 5xx errors and network failures up to 3 times.
 * 4xx errors are NOT retried (client-side issue).
 */
export async function retryInterceptor(error: AxiosError) {
  const config = error.config as (typeof error.config & { __retryCount?: number }) | undefined;

  if (!config) {
    return Promise.reject(error);
  }

  // Don't retry 4xx client errors
  if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
    return Promise.reject(error);
  }

  const retryCount = config.__retryCount ?? 0;
  const maxRetries = 3;

  if (retryCount >= maxRetries) {
    return Promise.reject(error);
  }

  // Exponential backoff: 300ms, 600ms, 1200ms
  const delay = Math.min(300 * 2 ** retryCount, 3000);
  await new Promise((resolve) => setTimeout(resolve, delay));

  config.__retryCount = retryCount + 1;

  const { apiClient } = await import('./axios');
  return apiClient(config);
}
