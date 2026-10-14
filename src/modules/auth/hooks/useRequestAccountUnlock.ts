import { useMutation , useQueryClient} from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';
import { apiErrorMessage } from "@/infrastructure/api-client/api-error";

export function useRequestAccountUnlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.requestAccountUnlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Unlock link sent! Check your email.');
    },
    onError: (error: any) => {
      const message = apiErrorMessage(error) || 'Failed to send unlock link';
      toast.error(message);
    }
  });
}
