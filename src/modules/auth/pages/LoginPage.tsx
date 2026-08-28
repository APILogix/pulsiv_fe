import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Building2, KeyRound, Loader2 } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { LoginMfaForm } from '../components/LoginMfaForm';
import { LoginBackupCodeForm } from '../components/LoginBackupCodeForm';
import {
  SOCIAL_PROVIDERS,
  SocialProviderButtons,
  type SocialProvider,
} from '../components/SocialProviders';
import { useLogin } from '../hooks/useLogin';
import { authApi } from '../api/auth.api';
import type { SsoDiscoveryResult } from '../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthCard,
  AuthDivider,
  AuthFooter,
  AuthHeading,
  AuthLink,
} from '@/shared/ui/pulse';

export default function LoginPage() {
  const { loginState, challengeData, login, loginMfa, loginBackup, isPending, resetState } = useLogin();
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);

  // Workspace lookup. The email step promises "we use this to find your
  // workspace" — this is what makes that true.
  const [discovery, setDiscovery] = useState<SsoDiscoveryResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const handleCancelMfa = () => {
    resetState();
    setShowBackupCodes(false);
  };

  const startSocialLogin = useCallback(async (provider: SocialProvider) => {
    setSocialProvider(provider);
    try {
      const result = await authApi.socialLogin(provider);
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSocialProvider(null);
    }
  }, []);

  /**
   * Resolve the address to its workspace. Deliberately fail-soft: discovery only
   * *enriches* the password step, so a failed lookup must never block a user who
   * already knows their password. It is also rate limited server-side (30 per
   * 15 min), which is another reason not to treat a miss as an error.
   */
  const resolveWorkspace = useCallback(async (email: string) => {
    setIsResolving(true);
    try {
      setDiscovery(await authApi.discoverSSO(email));
    } catch {
      setDiscovery(null);
    } finally {
      setIsResolving(false);
    }
  }, []);

  if (loginState === 'mfa_required' && challengeData) {
    if (showBackupCodes) {
      return (
        <LoginBackupCodeForm
          challengeId={challengeData.challengeId}
          loginBackupCode={loginBackup}
          isPending={isPending}
          onCancel={() => setShowBackupCodes(false)}
        />
      );
    }

    return (
      <LoginMfaForm
        challengeData={challengeData}
        loginMfa={loginMfa}
        isPending={isPending}
        onSelectBackupCodes={() => setShowBackupCodes(true)}
        onCancel={handleCancelMfa}
      />
    );
  }

  // Before discovery runs we cannot know which providers the deployment has
  // credentials for, so offer every supported provider and narrow afterwards.
  const availableProviders = discovery?.configured_link_providers?.length
    ? (discovery.configured_link_providers as readonly SocialProvider[])
    : SOCIAL_PROVIDERS;
  const linkedProviders = (discovery?.linked_social_providers ?? []) as readonly SocialProvider[];

  const ssoReady = Boolean(discovery && (discovery.saml_login_ready || discovery.oidc_login_ready));
  const ssoOrgName = discovery?.providers?.[0]?.org_name;

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Welcome back"
        title="Sign in"
        description="Continue with a linked provider, or sign in with your work email."
      />

      <AuthCard>
        <SocialProviderButtons
          onSelect={startSocialLogin}
          pendingProvider={socialProvider}
          disabled={isPending}
          available={availableProviders}
          linked={linkedProviders}
        />

        <AuthDivider>or continue with email</AuthDivider>

        <LoginForm
          login={login}
          isPending={isPending}
          onEmailResolved={resolveWorkspace}
          isResolving={isResolving}
          passwordStepSlot={
            <WorkspaceHint
              isResolving={isResolving}
              domain={discovery?.domain}
              ssoReady={ssoReady}
              ssoOrgName={ssoOrgName}
            />
          }
        />

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <span className="flex items-center gap-2 text-[12px] text-[var(--text3)]">
            <Building2 className="size-3.5" aria-hidden="true" />
            Enterprise access
          </span>
          <AuthLink to="/auth/login/sso">Sign in with SSO</AuthLink>
        </div>
      </AuthCard>

      <AuthFooter>
        Don&apos;t have an account? <AuthLink to="/auth/register">Create one</AuthLink>
      </AuthFooter>
    </div>
  );
}

/**
 * Result of the workspace lookup, shown above the password field.
 *
 * When the domain is governed by an identity provider this is the most important
 * thing on the screen: the user's password will not work, and saying so before
 * they try beats a failed attempt followed by a lockout counter.
 */
function WorkspaceHint({
  isResolving,
  domain,
  ssoReady,
  ssoOrgName,
}: {
  isResolving: boolean;
  domain?: string;
  ssoReady: boolean;
  ssoOrgName?: string;
}) {
  if (isResolving) {
    return (
      <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        Finding your workspace
      </p>
    );
  }

  if (!ssoReady) {
    // Nothing useful was learned. Stay silent rather than adding noise.
    return null;
  }

  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--brand-bg)] px-3 py-2.5">
      <KeyRound className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-[1.5] text-[var(--text)]">
          {ssoOrgName ? `${ssoOrgName} uses single sign-on` : 'This domain uses single sign-on'}
        </p>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">
          {domain ? (
            <>
              Accounts on <span className="font-mono text-[var(--text)]">{domain}</span> sign in through
              your identity provider.
            </>
          ) : (
            'Accounts on this domain sign in through your identity provider.'
          )}{' '}
          <AuthLink to="/auth/login/sso">Continue with SSO</AuthLink>
        </p>
      </div>
    </div>
  );
}
