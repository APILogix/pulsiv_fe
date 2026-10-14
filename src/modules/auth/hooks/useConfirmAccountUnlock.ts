import { useMutation , useQueryClient} from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';
import { apiErrorMessage } from "@/infrastructure/api-client/api-error";

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
      const message = apiErrorMessage(error) || 'Failed to unlock account';
      toast.error(message);
    }
  });
}
