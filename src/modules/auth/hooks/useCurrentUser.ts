import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryCache, authQueryKeys } from '../api/auth.query';
import { useAuthStore } from '../store/auth.store';
import type { UserProfile } from '../types/auth.types';

/**
 * Single source of truth for the current user profile.
 * Uses TanStack Query with a cache-first profile policy — no navigation refetches.
 * Automatically syncs the Zustand auth store on success.
 */
export function useCurrentUser() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useQuery<UserProfile>({
    queryKey: authQueryKeys.currentUser,
    queryFn: async () => {
      const user = await authApi.getCurrentUser();
      setAuth(user);
      return user;
    },
    staleTime: authQueryCache.currentUserStaleMs,
    gcTime: authQueryCache.gcMs,
  });
}

