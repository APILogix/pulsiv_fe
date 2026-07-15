import { useMutation , useQueryClient} from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';

export function useRequestAccountUnlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.requestAccountUnlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Unlock link sent! Check your email.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to send unlock link';
      toast.error(message);
    }
  });
}
