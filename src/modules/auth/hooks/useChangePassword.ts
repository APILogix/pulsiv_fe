import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useChangePassword() {
  return useMutation({
    mutationFn: authApi.changePassword,
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to change password';
      toast.error(message);
    }
  });
}
