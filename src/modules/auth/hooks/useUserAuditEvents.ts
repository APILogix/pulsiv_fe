import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryCache, authQueryKeys } from '../api/auth.query';

/**
 * TanStack Query hook for user audit events.
 * Replaces the old useEffect+useState pattern (rules.md violation).
 */
export function useUserAuditEvents(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? authQueryKeys.auditEvents(userId) : ['auth', 'audit-events', 'disabled'],
    queryFn: () => authApi.getUserAuditEvents(userId!, { limit: 30, offset: 0 }),
    enabled: !!userId,
    staleTime: authQueryCache.activityStaleMs,
    gcTime: authQueryCache.gcMs,
  });
}
