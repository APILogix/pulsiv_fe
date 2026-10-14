import { useActionState, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import type { MFAChallenge } from '../types/auth.types';
import { stepUpWithPasskey, WebAuthnCeremonyError } from '../services/webauthn.client';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthButton,
  AuthCallout,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthPending,
  AuthSubmit,
  AuthTextButton,
  CodeInput,
} from '@/shared/ui/pulse';
import { ActiveMethodFact, methodDescription } from '../components/MfaMethods';

/**
 * Step-up re-authentication. Renders inside the app shell, but speaks the same
 * visual language as the auth flow (design/auth/DESIGN.md) so a second-factor
 * prompt looks the same wherever it appears.
 */
export default function StepUpPage() {
  const navigate = useNavigate();
  const setStepUpFresh = useAuthStore((s) => s.setStepUpFresh);
  const [challenge, setChallenge] = useState<MFAChallenge | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resent, setResent] = useState(false);
  const isPasskey = challenge?.device_type === 'hardware_key';

  const goBack = () => {
    const rawFrom = new URLSearchParams(window.location.search).get('from') || '/dashboard';
    const isSafeInternal = rawFrom.startsWith('/') && !rawFrom.startsWith('//') && !rawFrom.includes('\\');
    const safeFrom = isSafeInternal ? rawFrom : '/dashboard';
    navigate(safeFrom, { replace: true });
  };

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const data = await authApi.requestMFAChallenge();
        setChallenge(data);
        setIsLoading(false);
      } catch (err) {
        setLoadError(getErrorMessage(err));
        setIsLoading(false);
      }
    };
    fetchChallenge();
  }, []);

  const [codeError, submitCode] = useActionState<string | null, FormData>(async (_previous, formData) => {
    if (!challenge) return 'Verification challenge is unavailable. Reload the page to try again.';
    const code = String(formData.get('code') ?? '').trim();
    if (code.length < 6) return 'Enter the 6-digit code to continue.';
    try {
      await authApi.verifyMFAChallenge({ challenge_id: challenge.challenge_id, code });
      setStepUpFresh(true);
      goBack();
      return null;
    } catch (err) {
      return getErrorMessage(err);
    }
  }, null);

  const [passkeyError, submitPasskey] = useActionState<string | null, FormData>(async () => {
    if (!challenge) return 'Verification challenge is unavailable. Reload the page to try again.';
    try {
      await stepUpWithPasskey(challenge.challenge_id);
      setStepUpFresh(true);
      goBack();
      return null;
    } catch (err) {
      return err instanceof WebAuthnCeremonyError ? err.message : getErrorMessage(err);
    }
  }, null);

  const handleResend = async () => {
    if (!challenge || challenge.device_type !== 'email') return;
    setIsResending(true);
    setResendError('');
    try {
      await authApi.resendEmailMfaOtp(challenge.device_id);
      setResent(true);
      setIsResending(false);
    } catch (err) {
      setResendError(getErrorMessage(err));
      setIsResending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px] py-10 sm:py-16">
      <AuthHeading
        title="Confirm it's you"
        description="This action changes account security settings, so it needs a fresh second-factor check before it runs."
      />

      {isLoading ? (
        <AuthPending>Starting verification…</AuthPending>
      ) : !challenge ? (
        <div className="flex flex-col gap-4">
          <AuthCallout icon={ShieldAlert} tone="danger" role="alert" title="Verification couldn't start">
            {loadError || 'The verification challenge could not be started.'}
          </AuthCallout>
          <AuthButton type="button" variant="ghost" onClick={goBack}>
            Go back
          </AuthButton>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ActiveMethodFact type={challenge.device_type} />

          {passkeyError && (
            <AuthCallout icon={ShieldAlert} tone="danger" role="alert" title="Verification failed">
              {passkeyError}
            </AuthCallout>
          )}

          {isPasskey ? (
            <form action={submitPasskey}>
              <AuthSubmit pendingLabel="Waiting for your security key…">Use security key</AuthSubmit>
            </form>
          ) : (
            <form action={submitCode} className="flex flex-col gap-4">
              <AuthField
                label="Verification code"
                hint={methodDescription(challenge.device_type)}
                error={codeError || resendError || undefined}
                trailing={
                  challenge.device_type === 'email' ? (
                    <AuthTextButton onClick={handleResend} disabled={isResending}>
                      {isResending ? 'Sending…' : resent ? 'Sent. Resend again' : 'Resend code'}
                    </AuthTextButton>
                  ) : undefined
                }
              >
                <CodeInput name="code" autoFocus />
              </AuthField>
              <AuthSubmit pendingLabel="Verifying…">Verify and continue</AuthSubmit>
            </form>
          )}
        </div>
      )}

      <AuthFooter>
        Lost access to your factors? <AuthLink to="/settings/mfa-recovery">Start MFA recovery</AuthLink>
      </AuthFooter>
    </div>
  );
}
