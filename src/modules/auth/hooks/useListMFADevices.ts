import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

export function useListMFADevices() {
  return useQuery({
    queryKey: ['mfa-devices'],
    queryFn: authApi.listMFADevices,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
