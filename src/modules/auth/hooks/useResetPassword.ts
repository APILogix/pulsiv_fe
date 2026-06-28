import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Password reset successfully!');
      navigate('/auth/login', { replace: true });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to reset password';
      toast.error(message);
    }
  });
}
