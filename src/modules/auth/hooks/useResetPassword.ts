import { useMutation , useQueryClient} from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useResetPassword() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Password reset successfully!');
      navigate('/auth/login', { replace: true });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to reset password';
      toast.error(message);
    }
  });
}
