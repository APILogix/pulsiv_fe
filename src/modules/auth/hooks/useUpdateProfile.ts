import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'sonner';
import { apiErrorMessage } from "@/infrastructure/api-client/api-error";

export function useUpdateProfile() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.updateCurrentUser,
    onSuccess: (updatedUser) => {
      setAuth(updatedUser);
      queryClient.setQueryData(authQueryKeys.currentUser, updatedUser);
      queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      const message = apiErrorMessage(error) || 'Failed to update profile';
      toast.error(message);
    }
  });
}
