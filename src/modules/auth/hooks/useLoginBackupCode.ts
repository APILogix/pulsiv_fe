import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'sonner';

export function useLoginBackupCode() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.loginBackupCode,
    onSuccess: () => {
      authApi.getCurrentUser().then((user) => {
        setAuth(user);
        navigate('/dashboard', { replace: true });
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Invalid backup code';
      toast.error(message);
    }
  });
}
