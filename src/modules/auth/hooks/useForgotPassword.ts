import { useMutation , useQueryClient} from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useForgotPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Password reset link sent! Check your email.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to send reset link';
      toast.error(message);
    }
  });
}
