import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { useAuthStore } from '../store/auth.store';
import { markPostLoginSetup } from '../components/PostLoginSetup';
import { toast } from 'sonner';

export function useLoginBackupCode() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.loginBackupCode,
    onSuccess: () => {
      authApi.getCurrentUser().then((user) => {
        setAuth(user);
        queryClient.setQueryData(authQueryKeys.currentUser, user);
        markPostLoginSetup();
        navigate('/dashboard', { replace: true });
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Invalid backup code';
      toast.error(message);
    }
  });
}
