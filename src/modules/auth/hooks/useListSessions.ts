import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

export function useListSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: authApi.listSessions,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
