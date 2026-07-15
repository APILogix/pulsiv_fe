import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { tokenService } from '../services/token.service';
import { useAuthStore } from '../store/auth.store';

export function useLogout() {
  const clear = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      tokenService.clearTokens();
      clear();
      queryClient.removeQueries({ queryKey: ['auth'] });
      navigate('/auth/login', { replace: true });
    },
  });
}
