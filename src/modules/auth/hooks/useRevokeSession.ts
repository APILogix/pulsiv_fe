import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { toast } from 'sonner';

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to revoke session';
      toast.error(message);
    }
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.revokeAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to revoke sessions';
      toast.error(message);
    }
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.revokeOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to revoke other sessions';
      toast.error(message);
    }
  });
}
