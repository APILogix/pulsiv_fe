import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { completeLogin } from '../services/post-login';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { toast } from 'sonner';
import type { AuthSession } from '../types/auth.types';

export type LoginState = 'idle' | 'mfa_required' | 'authenticated';

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [challengeData, setChallengeData] = useState<any>(null);

  async function handleSuccess(session: AuthSession) {
    await completeLogin(session, { setAuth, queryClient, navigate });
    setLoginState('authenticated');
  }

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if ('mfa_required' in data) {
        setChallengeData({
          challengeId: data.challenge_id,
          deviceType: data.device_type,
          expiresAt: data.expires_at,
          availableMethods: data.available_methods,
        });
        setLoginState('mfa_required');
        return;
      }
      handleSuccess(data);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  const mfaMutation = useMutation({
    mutationFn: authApi.loginMfa,
    onSuccess: (session) => {
      handleSuccess(session);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Invalid MFA code';
      toast.error(message);
    }
  });

  const backupMutation = useMutation({
    mutationFn: authApi.loginBackupCode,
    onSuccess: (session) => {
      handleSuccess(session);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Invalid backup code';
      toast.error(message);
    }
  });

  return {
    loginState,
    challengeData,
    login: loginMutation.mutate,
    loginMfa: mfaMutation.mutate,
    loginBackup: backupMutation.mutate,
    isPending: loginMutation.isPending || mfaMutation.isPending || backupMutation.isPending,
    resetState: () => {
      setLoginState('idle');
      setChallengeData(null);
    }
  };
}
