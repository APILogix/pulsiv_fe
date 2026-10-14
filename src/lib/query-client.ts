import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/infrastructure/api-client/api-error';
import { trackQueryLifecycle } from '@/shared/motion/page-ready';

/**
 * The app's single QueryClient.
 *
 * A module singleton (not created inside a component) so non-React code can
 * reach the cache: the session-expiry path in the refresh interceptor and
 * logout both need to drop every cached response, otherwise the next user on
 * this browser would briefly see the previous user's organization data.
 *
 * Defaults, and why:
 *  - staleTime 5 min: navigating back to a page renders from cache with no
 *    skeleton. Live surfaces (alerting, analytics) opt into shorter windows.
 *  - refetchOnMount (default true): a *stale* query refreshes in the
 *    background when its page mounts. Cached data still paints immediately,
 *    so this never shows a skeleton; it only stops hour-old data lingering.
 *  - retry: transport-level retries already happen in the axios retry
 *    interceptor for idempotent requests, so a normalized `ApiError` is final.
 *    Retrying it again here multiplied a single failure into up to 16
 *    requests and 4 error toasts. Unknown (non-API) errors get one retry.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

trackQueryLifecycle(queryClient);
