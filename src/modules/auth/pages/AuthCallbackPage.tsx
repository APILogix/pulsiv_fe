import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { completeLogin } from '../services/post-login';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthButton,
  AuthCallout,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthLinkButton,
  AuthPending,
  AuthTextButton,
} from '@/shared/ui/pulse';

/**
 * Landing route for social and SSO redirects (same-tab flow).
 *
 * Once the identity provider returns to this callback endpoint, the browser
 * exchanges the HTTP-only cookie established by the backend for the active
 * user profile and routes into the user's workspace.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  const callbackError = params.get('error');
  const [error, setError] = useState(() =>
    callbackError
      ? params.get('error_description') || params.get('message') || callbackError
      : ''
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [takingLong, setTakingLong] = useState(false);

  const confirmSession = useCallback(() => {
    if (callbackError) return;

    setIsRetrying(true);
    setError('');

    authApi
      .refreshSession()
      .then((session) => completeLogin(session, { setAuth, queryClient, navigate }))
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setIsRetrying(false);
      });
  }, [callbackError, navigate, queryClient, setAuth]);

  useEffect(() => {
    if (error) return;
    const timer = setTimeout(() => setTakingLong(true), 7000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    confirmSession();
  }, [confirmSession]);

  if (error) {
    return (
      <div className="w-full">
        <AuthHeading
          title="Sign-in didn't complete"
          description="Nothing was saved to this device. Try again, or sign in another way."
        />
        <div className="flex flex-col gap-4">
          <AuthCallout
            icon={ShieldAlert}
            tone="danger"
            role="alert"
            title={callbackError ? 'Your identity provider returned an error' : "We couldn't open your session"}
          >
            {error}
          </AuthCallout>

          {!callbackError && (
            <AuthButton type="button" onClick={confirmSession} pending={isRetrying}>
              Try again
            </AuthButton>
          )}

          <AuthLinkButton to="/auth/login" variant={callbackError ? 'primary' : 'ghost'}>
            Back to sign in
          </AuthLinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        title="Completing sign-in"
        description="Your identity provider confirmed you. We're opening your Sentinel session."
      />
      <AuthPending>Confirming your session…</AuthPending>

      {takingLong && (
        <p className="mt-6 text-[13px] text-[var(--text2)]" role="status">
          Taking longer than usual.{' '}
          <AuthTextButton onClick={confirmSession} disabled={isRetrying}>
            Try again
          </AuthTextButton>
        </p>
      )}

      <AuthFooter>
        <AuthLink to="/auth/login">Cancel and return to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
