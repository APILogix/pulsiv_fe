import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { useAuthStore } from '../store/auth.store';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { markPostLoginSetup } from '../components/PostLoginSetup';
import { toast } from 'sonner';

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if ('mfa_required' in data) {
        navigate('/auth/login/mfa', {
          state: {
            challengeId: data.challenge_id,
            deviceType: data.device_type,
            expiresAt: data.expires_at,
            availableMethods: data.available_methods,
          },
        });
        return;
      }
      authApi.getCurrentUser().then((user) => {
        setAuth(user);
        queryClient.setQueryData(authQueryKeys.currentUser, user);
        markPostLoginSetup();
        navigate('/dashboard', { replace: true });
      });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });
}
