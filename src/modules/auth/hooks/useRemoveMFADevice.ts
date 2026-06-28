import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useRemoveMFADevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, currentPassword }: { id: string; currentPassword?: string }) =>
      authApi.removeMFADevice(id, currentPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-devices'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('MFA device removed.');
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.code === 'PASSWORD_REQUIRED') return;
      const message = error.response?.data?.error?.message || 'Failed to remove MFA device';
      toast.error(message);
    }
  });
}
