import { useCallback, useState, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { Building2, KeyRound, Loader2 } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';

const LoginMfaForm = lazy(() =>
  import('../components/LoginMfaForm').then((m) => ({ default: m.LoginMfaForm }))
);
const LoginBackupCodeForm = lazy(() =>
  import('../components/LoginBackupCodeForm').then((m) => ({ default: m.LoginBackupCodeForm }))
);
import {
  SOCIAL_PROVIDERS,
  SocialProviderButtons,
  type SocialProvider,
} from '../components/SocialProviders';
import { useLogin } from '../hooks/useLogin';
import { authApi } from '../api/auth.api';
import type { SsoDiscoveryResult } from '../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Link } from 'react-router';
import { AuthDivider, AuthLink } from '@/shared/ui/pulse';
import { useAuthFocus } from '@/app/layouts/auth-shell';

export default function LoginPage() {
  const { loginState, challengeData, login, loginMfa, loginBackup, isPending, resetState } = useLogin();
  // The inline second factor is a mid-flow step: same focused shell as /auth/login/mfa.
  useAuthFocus(loginState === 'mfa_required' && Boolean(challengeData));
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

  const startSocialLogin = useCallback((provider: SocialProvider) => {
    setSocialProvider(provider);
    authApi
      .socialLogin(provider)
      .then((result) => {
        window.location.assign(result.authorization_url);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
        setSocialProvider(null);
      });
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
        <Suspense fallback={null}>
          <LoginBackupCodeForm
            challengeId={challengeData.challengeId}
            loginBackupCode={loginBackup}
            isPending={isPending}
            onCancel={() => setShowBackupCodes(false)}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={null}>
        <LoginMfaForm
          challengeData={challengeData}
          loginMfa={loginMfa}
          isPending={isPending}
          onSelectBackupCodes={() => setShowBackupCodes(true)}
          onCancel={handleCancelMfa}
        />
      </Suspense>
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
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text)]">
          Sign in to Sentinel
        </h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-[var(--text2)]">
          New here? <AuthLink to="/auth/register">Create an account</AuthLink>
        </p>
      </header>

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

      <AuthDivider>or</AuthDivider>

      <div className="flex flex-col gap-2">
        <SocialProviderButtons
          onSelect={startSocialLogin}
          pendingProvider={socialProvider}
          disabled={isPending}
          available={availableProviders}
          linked={linkedProviders}
        />
        <Link
          to="/auth/login/sso"
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius)] border border-[var(--border2)] text-[13px] font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--text3)] hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          <Building2 className="size-[18px]" aria-hidden="true" />
          Continue with SSO
        </Link>
      </div>

      <p className="mt-8 text-[12px] leading-[1.6] text-[var(--text3)]">
        By continuing, you agree to Sentinel&apos;s Terms and Conditions and Privacy Policy.
      </p>
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
      <p className="flex items-center gap-2 text-[12px] text-[var(--text3)]" role="status">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Finding your workspace…
      </p>
    );
  }

  if (!ssoReady) {
    // Nothing useful was learned. Stay silent rather than adding noise.
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg1)] px-3.5 py-3" role="status">
      <KeyRound className="mt-0.5 size-4 shrink-0 text-[var(--text)]" aria-hidden="true" />
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
