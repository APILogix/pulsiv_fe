/**
 * Shared post-login orchestration.
 *
 * All login routes (/login, /login/mfa, /login/backup-code) return an enriched
 * AuthSession via the backend's `sendAuthSession` helper, which includes
 * `user`, `default_org_slug`, and `organizations`.
 *
 * The only exception is `/login/mfa/webauthn/verify` which bypasses
 * `sendAuthSession` and returns raw tokens. For that case, we fall back to
 * `getCurrentUser()`.
 *
 * This module provides a single function that handles both cases uniformly.
 */
import type { QueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { markPostLoginSetup } from './post-login-setup-flag';
import type { AuthSession } from '../types/auth.types';

interface PostLoginDeps {
  setAuth: (user: any) => void;
  queryClient: QueryClient;
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

/**
 * Complete the login flow after a successful session response.
 *
 * Fetches the full user profile (required for the auth store which expects
 * UserProfile, not the minimal AuthSessionUser), seeds the query cache,
 * marks the post-login animation, and navigates to the dashboard.
 */
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

  markPostLoginSetup();
  navigate('/dashboard', { replace: true });
}
