import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if ('mfa_required' in data) {
        navigate('/auth/login-mfa', {
          state: {
            challengeId: data.challenge_id,
            deviceType: data.device_type,
            expiresAt: data.expires_at,
          },
        });
        return;
      }
      authApi.getCurrentUser().then((user) => {
        setAuth(user);
        navigate('/dashboard', { replace: true });
      });
    },
  });
}
