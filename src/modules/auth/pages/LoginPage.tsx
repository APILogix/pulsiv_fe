import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { LoginForm } from '../components/LoginForm';
import { LoginMfaForm } from '../components/LoginMfaForm';
import { LoginBackupCodeForm } from '../components/LoginBackupCodeForm';
import { useLogin } from '../hooks/useLogin';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';

function PulsivWordmark() {
  return (
    <svg viewBox="0 0 260 64" aria-label="Pulsiv" className="h-11 w-auto">
      <text
        x="0"
        y="44"
        fontFamily='ui-monospace, "SF Mono", "JetBrains Mono", Consolas, monospace'
        fontWeight="700"
        fontSize="34"
        letterSpacing="4"
      >
        <tspan fill="var(--text)">P</tspan>
        <tspan fill="var(--text)">U</tspan>
        <tspan fill="var(--text)">L</tspan>
        <tspan fill="var(--text)">S</tspan>
        <tspan fill="var(--brand)">I</tspan>
        <tspan fill="var(--text)">V</tspan>
      </text>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.25-.95 2.3-2 3.01l3.23 2.5c1.88-1.73 2.97-4.27 2.97-7.3 0-.71-.06-1.39-.18-2.04H12z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.23-2.5c-.9.6-2.05.95-3.38.95-2.6 0-4.81-1.75-5.6-4.1l-3.34 2.58A9.99 9.99 0 0 0 12 22z" />
      <path fill="#4A90E2" d="M6.4 13.9A6 6 0 0 1 6.09 12c0-.66.11-1.3.31-1.9L3.06 7.52A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.48l3.34-2.58z" />
      <path fill="#FBBC05" d="M12 5.98c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.95 2.96 14.7 2 12 2 8.08 2 4.7 4.24 3.06 7.52l3.34 2.58c.79-2.35 3-4.12 5.6-4.12z" />
    </svg>
  );
}

export default function LoginPage() {
  const { loginState, challengeData, login, loginMfa, loginBackup, isPending, resetState } = useLogin();
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [socialProvider, setSocialProvider] = useState<string | null>(null);

  const handleCancelMfa = () => {
    resetState();
    setShowBackupCodes(false);
  };

  async function startSocialLogin(provider: 'github' | 'google' | 'microsoft') {
    setSocialProvider(provider);
    try {
      const result = await authApi.socialLogin(provider);
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSocialProvider(null);
    }
  }

  if (loginState === 'mfa_required' && challengeData) {
    if (showBackupCodes) {
      return <LoginBackupCodeForm challengeId={challengeData.challengeId} loginBackupCode={loginBackup} isPending={isPending} onCancel={() => setShowBackupCodes(false)} />;
    }

    return <LoginMfaForm challengeData={challengeData} loginMfa={loginMfa} isPending={isPending} onSelectBackupCodes={() => setShowBackupCodes(true)} onCancel={handleCancelMfa} />;
  }

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <p className="mb-6 text-[13px] text-[var(--text3)]">
          Don&apos;t have an account?{' '}
          <Link to="/auth/register" className="font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)]">
            Create one
          </Link>
        </p>
        <div className="mb-5 flex items-center justify-center">
          <PulsivWordmark />
        </div>
        <h1 className="mb-2 text-[28px] font-semibold tracking-[-0.04em] text-[var(--text)]">Sign in to Pulsiv</h1>
        <p className="text-[15px] text-[var(--text2)]">Continue with Google or sign in with your work email.</p>
      </div>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-[var(--pulse-surface-elevated)]">
        <button
          type="button"
          disabled={socialProvider !== null}
          onClick={() => startSocialLogin('google')}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--input)] hover:bg-[var(--bg3)] disabled:opacity-60"
        >
          <GoogleIcon />
          {socialProvider === 'google' ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="my-5 flex items-center text-center">
          <div className="flex-1 border-b border-[var(--border)]" />
          <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text3)]">
            or continue with email
          </span>
          <div className="flex-1 border-b border-[var(--border)]" />
        </div>

        <LoginForm login={login} isPending={isPending} />

        <div className="mt-5 flex items-center justify-between gap-3 text-[12px] text-[var(--text3)]">
          <span>Need enterprise access?</span>
          <Link to="/auth/login/sso" className="font-medium text-[var(--text2)] transition-colors hover:text-[var(--text)]">
            Sign in with SSO
          </Link>
        </div>
      </div>
    </div>
  );
}
