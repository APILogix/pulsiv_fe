import { useMutation , useQueryClient} from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useConfirmAccountUnlock() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.confirmAccountUnlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Account successfully unlocked!');
      navigate('/auth/login', { replace: true });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to unlock account';
      toast.error(message);
    }
  });
}
