import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import type { UserProfile } from '../types/auth.types';

/**
 * Single source of truth for the current user profile.
 * Uses TanStack Query with a 5-minute staleTime — no unnecessary refetches.
 * Automatically syncs the Zustand auth store on success.
 */
export function useCurrentUser() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useQuery<UserProfile>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const user = await authApi.getCurrentUser();
      setAuth(user);
      return user;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Imperatively refresh the current user.
 * Call after mutations that change user state (MFA toggle, profile update, etc.)
 */
export function useRefreshCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['current-user'] });
}
