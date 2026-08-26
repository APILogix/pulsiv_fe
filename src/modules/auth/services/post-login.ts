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

  const hasOrgs = (session.organizations && session.organizations.length > 0) || Boolean(session.default_org_id) || Boolean(session.current_org_id);

  if (!hasOrgs) {
    navigate('/onboarding/organization', { replace: true });
    return;
  }

  markLoginMetricsTransition();
  const targetSlug =
    session.default_org_slug ??
    session.organizations?.find((o) => o.id === (session.current_org_id ?? session.default_org_id))?.slug ??
    session.organizations?.[0]?.slug ??
    null;

  if (targetSlug) {
    navigate(`/${targetSlug}/dashboard`, { replace: true });
  } else {
    navigate('/dashboard', { replace: true });
  }
}

