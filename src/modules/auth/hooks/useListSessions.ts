import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryCache, authQueryKeys } from '../api/auth.query';

export function useListSessions() {
  return useQuery({
    queryKey: authQueryKeys.sessions,
    queryFn: authApi.listSessions,
    staleTime: authQueryCache.activityStaleMs,
    gcTime: authQueryCache.gcMs,
  });
}
