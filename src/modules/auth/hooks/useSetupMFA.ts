import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useSetupMFA() {
  return useMutation({
    mutationFn: authApi.setupMFA,
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to initialize MFA setup';
      toast.error(message);
    }
  });
}
