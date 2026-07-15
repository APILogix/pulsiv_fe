import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryCache, authQueryKeys } from '../api/auth.query';

export function useListMFADevices() {
  return useQuery({
    queryKey: authQueryKeys.mfaDevices,
    queryFn: authApi.listMFADevices,
    staleTime: authQueryCache.securityStateStaleMs,
    gcTime: authQueryCache.gcMs,
  });
}
