import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { toast } from 'sonner';

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      // Invalidate current user so any session-related UI reflects the update
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to change password';
      toast.error(message);
    }
  });
}
