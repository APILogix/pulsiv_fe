import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { tokenService } from '../services/token.service';
import { useAuthStore } from '../store/auth.store';

export function useLogout() {
  const clear = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      tokenService.clearTokens();
      clear();
      navigate('/auth/login', { replace: true });
    },
  });
}
