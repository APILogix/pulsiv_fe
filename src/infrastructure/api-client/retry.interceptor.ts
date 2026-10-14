import axios, { type AxiosError, type AxiosInstance } from 'axios';

/**
 * Retry interceptor — the only retry layer for API calls.
 *
 * - Idempotent methods only (GET/HEAD/OPTIONS). Replaying a POST/PATCH/DELETE
 *   after a timeout can apply the write twice, so writes are never retried.
 * - 5xx and network failures only; 4xx is a client-side issue.
 * - Cancelled requests (TanStack Query aborting a superseded fetch) are
 *   passed straight through, never retried.
 * - Backoff waits abort with the request's signal.
 *
 * TanStack Query does not retry `ApiError`s on top of this (lib/query-client).
 */

const IDEMPOTENT = new Set(['get', 'head', 'options']);
const MAX_RETRIES = 2;

function wait(ms: number, signal?: AbortSignal | { aborted?: boolean }) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal && 'addEventListener' in signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new axios.CanceledError('Request aborted during retry backoff'));
        },
        { once: true },
      );
    }
  });
}

export function createRetryInterceptor(client: AxiosInstance) {
  return async function retryInterceptor(error: AxiosError) {
    if (axios.isCancel(error)) return Promise.reject(error);

    const config = error.config as (typeof error.config & { __retryCount?: number }) | undefined;
    if (!config) return Promise.reject(error);

    const method = (config.method ?? 'get').toLowerCase();
    if (!IDEMPOTENT.has(method)) return Promise.reject(error);

    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return Promise.reject(error);

    const retryCount = config.__retryCount ?? 0;
    if (retryCount >= MAX_RETRIES) return Promise.reject(error);

    if (config.signal?.aborted) return Promise.reject(error);

    // Exponential backoff: 300ms, 600ms
    await wait(Math.min(300 * 2 ** retryCount, 3000), config.signal as AbortSignal | undefined);

    config.__retryCount = retryCount + 1;
    return client(config);
  };
}
