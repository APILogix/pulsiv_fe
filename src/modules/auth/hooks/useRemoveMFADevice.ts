import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { toast } from 'sonner';

export function useRemoveMFADevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, currentPassword }: { id: string; currentPassword?: string }) =>
      authApi.removeMFADevice(id, currentPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.mfaDevices });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
      toast.success('MFA device removed.');
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.code === 'PASSWORD_REQUIRED') return;
      const message = error.response?.data?.error?.message || 'Failed to remove MFA device';
      toast.error(message);
    }
  });
}
