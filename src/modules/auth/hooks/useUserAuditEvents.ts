import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

/**
 * TanStack Query hook for user audit events.
 * Replaces the old useEffect+useState pattern (rules.md violation).
 */
export function useUserAuditEvents(userId: string | undefined) {
  return useQuery({
    queryKey: ['audit-events', userId],
    queryFn: () => authApi.getUserAuditEvents(userId!, { limit: 30, offset: 0 }),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
