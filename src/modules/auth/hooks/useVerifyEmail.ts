import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { apiErrorMessage } from "@/infrastructure/api-client/api-error";

export function useVerifyEmail() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  return useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      setSearchParams({ status: 'success' });
      toast.success('Email successfully verified!');
    },
    onError: (error: any) => {
      const message = apiErrorMessage(error) || 'Failed to verify email';
      toast.error(message);
      navigate('/auth/login');
    }
  });
}
