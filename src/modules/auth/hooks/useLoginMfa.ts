import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { completeLogin } from '../services/post-login';
import { toast } from 'sonner';

export function useLoginMfa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.loginMfa,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      completeLogin(session, { setAuth, queryClient, navigate });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Invalid MFA code';
      toast.error(message);
    }
  });
}

