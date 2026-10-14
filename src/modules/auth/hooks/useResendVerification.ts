import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';
import { apiErrorMessage } from "@/infrastructure/api-client/api-error";

export function useResendVerification() {
  return useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      toast.success('Verification email sent! Check your inbox.');
    },
    onError: (error: any) => {
      const message = apiErrorMessage(error) || 'Failed to resend verification email';
      toast.error(message);
    }
  });
}
