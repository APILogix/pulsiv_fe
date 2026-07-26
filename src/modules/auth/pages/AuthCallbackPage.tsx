import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { completeLogin } from '../services/post-login';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthButton,
  AuthCard,
  AuthHeading,
  AuthResult,
  IconChip,
  Notice,
} from '@/shared/ui/pulse';

// This route renders outside AuthLayout, so the shell, backdrop, and wordmark
// live here to stay visually consistent with the rest of auth.
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] w-full bg-[var(--bg)] font-sans text-[var(--text)] antialiased">
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[100dvh] flex-col p-6 sm:p-10">
        <div className="flex items-center justify-center sm:justify-start">
          <span
            className="font-[family-name:var(--mono)] text-[27px] font-bold tracking-[0.16em] text-[var(--text)]"
            aria-label="Pulsiv"
          >
            PULS<span className="text-[var(--brand)]">I</span>V
          </span>
        </div>
        <div className="pulse-rise mx-auto my-auto w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const callbackError = params.get('error');
  const [error, setError] = useState(() => 
    callbackError ? (params.get('error_description') || params.get('message') || callbackError) : ''
  );

  useEffect(() => {
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: 'pulsiv:identity-link', linked: true }, window.location.origin);
      window.close();
      return;
    }
    if (callbackError) {
      return;
    }

    authApi.refreshSession()
      .then((session) => completeLogin(session, { setAuth, queryClient, navigate }))
      .catch((err) => setError(getErrorMessage(err)));
  }, [callbackError, navigate, params, queryClient, setAuth]);

  return (
    <AuthShell>
      {error ? (
        <div className="w-full">
          <AuthResult
            icon={ShieldAlert}
            tone="red"
            title="Sign-in failed"
            description={error}
            actions={
              <AuthButton type="button" onClick={() => navigate('/auth/login', { replace: true })}>
                Back to sign in
              </AuthButton>
            }
          >
            <Notice tone="red">
              Nothing was changed on your account. Try signing in again, or use a different provider.
            </Notice>
          </AuthResult>
        </div>
      ) : (
        <div className="w-full">
          <AuthHeading
            eyebrow="Identity handshake"
            icon={ShieldCheck}
            tone="ai"
            title="Completing sign-in"
            description="We're exchanging tokens with your provider and starting your session."
          />
          <AuthCard>
            <div className="flex items-center gap-3">
              <IconChip icon={ShieldCheck} tone="ai" size="sm" />
              <p className="flex items-center gap-2 text-[13px] text-[var(--text2)]" role="status" aria-live="polite">
                <Loader2 className="size-3.5 animate-spin text-[var(--ai)]" aria-hidden="true" />
                Verifying your session…
              </p>
            </div>
            <p className="mt-4 border-t border-[var(--border)] pt-3.5 text-[12px] leading-relaxed text-[var(--text3)]">
              Keep this tab open. You&apos;ll be redirected as soon as the handshake finishes.
            </p>
          </AuthCard>
        </div>
      )}
    </AuthShell>
  );
}
