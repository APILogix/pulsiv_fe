import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { toast } from 'sonner';

export function useVerifyMFASetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyMFASetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.mfaDevices });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
      toast.success('MFA successfully enabled!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Invalid verification code';
      toast.error(message);
    }
  });
}
