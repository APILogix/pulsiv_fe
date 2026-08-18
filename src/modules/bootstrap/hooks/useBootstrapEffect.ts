import { useEffect } from 'react';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { bootstrapService } from '../services/bootstrap.service';
import { useBootstrapStore, STALE_THRESHOLD_MS } from '../store/bootstrap.store';

/**
 * Global Authenticated App Bootstrap Effect.
 * Mounted at the AuthenticatedAppLayout shell boundary.
 *
 * Behaviors:
 * 1. Triggers deduplicated bootstrap fetch on authenticated app start.
 * 2. Re-validates stale state in background when window regains network connectivity.
 * 3. Monitors age of bootstrap snapshot and marks stale when > 5 minutes old.
 */
export function useBootstrapEffect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useBootstrapStore((s) => s.hasHydrated);
  const lastSuccessfulFetchAt = useBootstrapStore((s) => s.lastSuccessfulFetchAt);

  // 1. Primary bootstrap fetch when authenticated
  useEffect(() => {
    if (!isAuthenticated || !hasHydrated) return;

    // Fetch initial or stale bootstrap
    bootstrapService.fetchBootstrap().catch(() => undefined);
  }, [isAuthenticated, hasHydrated]);

  // 2. Reconnect & stale timer listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleOnline = () => {
      // Re-fetch fresh bootstrap on network reconnect
      bootstrapService.fetchBootstrap({ force: true }).catch(() => undefined);
    };

    window.addEventListener('online', handleOnline);

    // Periodic stale check timer (every 60 seconds)
    const interval = setInterval(() => {
      if (lastSuccessfulFetchAt) {
        const age = Date.now() - lastSuccessfulFetchAt;
        if (age >= STALE_THRESHOLD_MS) {
          useBootstrapStore.getState().markStale();
        }
      }
    }, 60_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [isAuthenticated, lastSuccessfulFetchAt]);
}
