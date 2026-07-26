/**
 * Shared post-login orchestration.
 *
 * Login restores the authenticated user and routes immediately. Workspace
 * setup is intentionally triggered only after organization creation.
 */
import type { QueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { markLoginMetricsTransition } from './post-login-setup-flag';
import type { AuthSession, UserProfile } from '../types/auth.types';

interface PostLoginDeps {
  setAuth: (user: UserProfile) => void;
  queryClient: QueryClient;
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

export async function completeLogin(
  session: AuthSession,
  { setAuth, queryClient, navigate }: PostLoginDeps,
): Promise<void> {
  const user = await authApi.getCurrentUser();
  setAuth(user);
  queryClient.setQueryData(authQueryKeys.currentUser, user);

  if (session.organizations?.length === 0) {
    navigate('/onboarding/organization', { replace: true });
    return;
  }

  markLoginMetricsTransition();
  navigate('/dashboard', { replace: true });
}
