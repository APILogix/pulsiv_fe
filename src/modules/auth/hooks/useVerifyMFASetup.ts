import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useVerifyMFASetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyMFASetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-devices'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('MFA successfully enabled!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Invalid verification code';
      toast.error(message);
    }
  });
}
