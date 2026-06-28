import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (_, variables) => {
      navigate(`/auth/verify-email?email=${encodeURIComponent(variables.email)}`, {
        state: { message: 'Account created. Please check your email to verify.' },
      });
    },
  });
}
