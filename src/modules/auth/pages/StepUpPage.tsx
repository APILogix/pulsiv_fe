import { useActionState, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Info, KeyRound, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import type { MFAChallenge, MFAType } from '../types/auth.types';
import { stepUpWithPasskey, WebAuthnCeremonyError } from '../services/webauthn.client';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthField,
  AuthLink,
  AuthSubmit,
  CodeInput,
  IconChip,
  Notice,
  Panel,
  Pill,
  type SurfaceTone,
} from '@/shared/ui/pulse';
import { Button, CardSkeleton } from '@/shared/observe';

const METHOD_ICON: Record<string, LucideIcon> = {
  totp: Smartphone,
  email: Mail,
  sms: Smartphone,
  hardware_key: KeyRound,
  backup_codes: ShieldCheck,
};

const METHOD_LABEL: Record<string, string> = {
  totp: 'Authenticator app',
  email: 'Email code',
  sms: 'Text message',
  hardware_key: 'Security key',
  backup_codes: 'Backup code',
};

const METHOD_TONE: Record<string, SurfaceTone> = {
  totp: 'brand',
  email: 'blue',
  sms: 'blue',
  hardware_key: 'ai',
  backup_codes: 'amber',
};

const METHOD_DESCRIPTION: Record<string, string> = {
  totp: 'Enter the 6-digit code from your authenticator app.',
  email: 'Enter the 6-digit code sent to your email.',
  sms: 'Enter the 6-digit code sent to your phone.',
  hardware_key: 'Use your security key or passkey to continue.',
  backup_codes: 'Enter one of your single-use recovery codes.',
};

function methodLabel(type: MFAType | undefined) {
  return type ? METHOD_LABEL[type] ?? 'Verification' : 'Verification';
}

function methodTone(type: MFAType | undefined): SurfaceTone {
  return type ? METHOD_TONE[type] ?? 'brand' : 'brand';
}

// One-off: the active factor banner shown above the challenge form.
function ActiveFactor({ challenge }: { challenge: MFAChallenge }) {
  const Icon = METHOD_ICON[challenge.device_type] ?? ShieldCheck;
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
      <IconChip icon={Icon} tone={methodTone(challenge.device_type)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--text)]">{methodLabel(challenge.device_type)}</p>
        <p className="truncate text-[12px] text-[var(--text3)]">
          {METHOD_DESCRIPTION[challenge.device_type] ?? 'Confirm your identity to continue.'}
        </p>
      </div>
      <Pill tone={methodTone(challenge.device_type)}>{methodLabel(challenge.device_type)}</Pill>
    </div>
  );
}

export default function StepUpPage() {
  const navigate = useNavigate();
  const setStepUpFresh = useAuthStore((s) => s.setStepUpFresh);
  const [challenge, setChallenge] = useState<MFAChallenge | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const isPasskey = challenge?.device_type === 'hardware_key';

  const goBack = () => {
    const from = new URLSearchParams(window.location.search).get('from') || '/dashboard';
    navigate(from, { replace: true });
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
      setIsResending(false);
    } catch (err) {
      setResendError(getErrorMessage(err));
      setIsResending(false);
    }
  };

  const errorMessage = codeError || passkeyError;

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <IconChip icon={ShieldCheck} tone="brand" size="lg" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ai)]">Account security</p>
        <h1 className="font-[family-name:var(--display)] text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)]">
          Verify your identity
        </h1>
        <p className="max-w-[40ch] text-[13.5px] leading-relaxed text-[var(--text2)]">
          {isPasskey
            ? METHOD_DESCRIPTION.hardware_key
            : METHOD_DESCRIPTION[challenge?.device_type ?? 'totp'] ?? 'Confirm your identity to continue.'}
        </p>
      </div>

      <Notice tone="blue" icon={Info} title="Re-authentication required">
        The action you requested changes account security settings, so a fresh verification is needed before it runs.
      </Notice>

      <Panel>
        {isLoading ? (
          <CardSkeleton />
        ) : !challenge ? (
          <div className="flex flex-col gap-4">
            <Notice tone="red" title="Verification unavailable">
              {loadError || 'The verification challenge could not be started.'}
            </Notice>
            <Button variant="secondary" onClick={goBack}>
              Go back
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ActiveFactor challenge={challenge} />

            {errorMessage && (
              <Notice tone="red" title="Verification failed">
                {errorMessage}
              </Notice>
            )}

            {isPasskey ? (
              <form action={submitPasskey}>
                <AuthSubmit pendingLabel="Waiting for security key…">Use security key</AuthSubmit>
              </form>
            ) : (
              <>
                {challenge.device_type === 'email' && (
                  <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[13px] text-[var(--text2)]">
                      <Mail className="size-4 text-[var(--blue)]" aria-hidden="true" />
                      Code sent to your email
                    </span>
                    <Button variant="secondary" disabled={isResending} onClick={handleResend}>
                      {isResending ? 'Sending…' : 'Resend'}
                    </Button>
                  </div>
                )}

                {resendError && (
                  <Notice tone="red" title="Could not resend the code">
                    {resendError}
                  </Notice>
                )}

                <form action={submitCode} className="flex flex-col gap-4">
                  <AuthField label="Verification code">
                    <CodeInput name="code" autoFocus />
                  </AuthField>
                  <AuthSubmit pendingLabel="Verifying…">Verify identity</AuthSubmit>
                </form>
              </>
            )}
          </div>
        )}
      </Panel>

      <p className="text-center text-[12.5px] text-[var(--text3)]">
        Lost access to your factors? <AuthLink to="/settings/mfa-recovery">Start MFA recovery</AuthLink>
      </p>
    </div>
  );
}
