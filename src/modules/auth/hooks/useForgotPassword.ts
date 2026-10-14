import { useMutation , useQueryClient} from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { toast } from 'sonner';
import { apiErrorMessage } from "@/infrastructure/api-client/api-error";

export function useForgotPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Password reset link sent! Check your email.');
    },
    onError: (error: any) => {
      const message = apiErrorMessage(error) || 'Failed to send reset link';
      toast.error(message);
    }
  });
}
