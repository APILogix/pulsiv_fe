import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast.success('Password reset link sent! Check your email.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to send reset link';
      toast.error(message);
    }
  });
}
