import { useActionState, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { loginMfaSchema } from '../schemas/auth.schema';
import type { LoginMfaFormData } from '../schemas/auth.schema';
import type { LoginMfaMethod, MFAType } from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { loginWithPasskey, WebAuthnCeremonyError } from '../services/webauthn.client';
import { completeLogin } from '../services/post-login';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthButton,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthTextButton,
  CodeInput,
} from '@/shared/ui/pulse';
import { ActiveMethodFact, MethodList, methodDescription, methodTitle } from './MfaMethods';
import { toast } from 'sonner';

interface LoginMfaFormProps {
  challengeData: {
    challengeId: string;
    deviceType?: MFAType;
    availableMethods?: LoginMfaMethod[];
  };
  loginMfa: (data: LoginMfaFormData) => void;
  isPending: boolean;
  onSelectBackupCodes: () => void;
  onCancel: () => void;
}

export function LoginMfaForm({ challengeData, loginMfa, isPending, onSelectBackupCodes, onCancel }: LoginMfaFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { challengeId, deviceType: initialDeviceType, availableMethods } = challengeData;

  const methods: LoginMfaMethod[] = availableMethods ?? [];

  const [current, setCurrent] = useState<LoginMfaMethod>(() => {
    const primary =
      methods.find((m) => m.is_primary) ||
      methods.find((m) => m.type === initialDeviceType) ||
      methods[0];
    return (
      primary ?? {
        id: 'primary',
        type: (initialDeviceType ?? 'totp') as MFAType,
        name: methodTitle((initialDeviceType ?? 'totp') as MFAType),
      }
    );
  });

  const [showPicker, setShowPicker] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const autoPasskeyStarted = useRef(false);

  const isCodeMethod = current.type === 'totp' || current.type === 'email' || current.type === 'sms';
  const isPasskey = current.type === 'hardware_key';

  // Same zod contract as before — only the form plumbing changed.
  const [codeError, submitCode] = useActionState<string | null, FormData>((_previous, formData) => {
    const parsed = loginMfaSchema.safeParse({
      challenge_id: challengeId ?? '',
      code: String(formData.get('code') ?? '').trim(),
    });
    if (!parsed.success) return 'Enter the 6-digit code to continue.';
    loginMfa(parsed.data);
    return null;
  }, null);

  // Complete login once a passkey assertion succeeds.
  // WebAuthn verify returns raw tokens (no embedded user), so completeLogin
  // will fall through to getCurrentUser() automatically.
  async function runPasskey() {
    if (!challengeId) return;
    setPasskeyBusy(true);
    try {
      const session = await loginWithPasskey(challengeId);
      await completeLogin(session, { setAuth, queryClient, navigate });
      setPasskeyBusy(false);
    } catch (err) {
      const msg = err instanceof WebAuthnCeremonyError ? err.message : getErrorMessage(err);
      toast.error(msg);
      setPasskeyBusy(false);
    }
  }

  useEffect(() => {
    if (!challengeId) {
      onCancel();
    }
  }, [challengeId, onCancel]);

  // Auto-trigger the passkey ceremony when the primary method is a security key.
  useEffect(() => {
    if (isPasskey && challengeId && !autoPasskeyStarted.current) {
      autoPasskeyStarted.current = true;
      void (async () => {
        setPasskeyBusy(true);
        try {
          const session = await loginWithPasskey(challengeId);
          await completeLogin(session, { setAuth, queryClient, navigate });
          setPasskeyBusy(false);
        } catch (err) {
          const msg = err instanceof WebAuthnCeremonyError ? err.message : getErrorMessage(err);
          toast.error(msg);
          setPasskeyBusy(false);
        }
      })();
    }
  }, [challengeId, isPasskey, navigate, queryClient, setAuth]);

  async function selectMethod(method: LoginMfaMethod) {
    if (method.id === current.id) {
      setShowPicker(false);
      return;
    }

    if (method.type === 'backup_codes') {
      onSelectBackupCodes();
      return;
    }

    setIsSwitching(true);
    try {
      await authApi.switchLoginMfaMethod(challengeId!, method.id);
      setCurrent(method);
      setShowPicker(false);
      if (method.type === 'email') {
        toast.success('Verification code sent to your email');
      } else if (method.type === 'sms') {
        toast.success('Verification code sent via text message');
      } else if (method.type === 'hardware_key') {
        await runPasskey();
      }
      setIsSwitching(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsSwitching(false);
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function resendEmailCode() {
    if (current.type !== 'email' || !current.id || current.id === 'primary' || resendCooldown > 0) return;
    setIsResending(true);
    try {
      await authApi.resendEmailMfaOtp(current.id);
      setResendCooldown(30);
      toast.success('Verification code sent');
      setIsResending(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsResending(false);
    }
  }

  if (!challengeId) return null;

  const alternativeMethods = methods.filter((m) => m.id !== current.id);
  const busy = isSwitching || passkeyBusy;

  return (
    <div className="w-full">
      <AuthHeading title="Two-step verification" description={methodDescription(current.type)} />

      <div className="flex flex-col gap-4">
        <ActiveMethodFact type={current.type} name={current.name} hint={current.display_hint ?? undefined} />

        {isCodeMethod && (
          <form action={submitCode} className="flex flex-col gap-4">
            <AuthField
              label="Verification code"
              error={codeError ?? undefined}
              trailing={
                current.type === 'email' && current.id !== 'primary' ? (
                  <AuthTextButton onClick={resendEmailCode} disabled={isResending || resendCooldown > 0}>
                    {isResending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </AuthTextButton>
                ) : undefined
              }
            >
              <CodeInput key={current.id} name="code" autoFocus disabled={isPending || isSwitching} />
            </AuthField>

            <AuthButton type="submit" pending={isPending} disabled={isSwitching}>
              Verify and sign in
            </AuthButton>
          </form>
        )}

        {isPasskey && (
          <AuthButton type="button" onClick={runPasskey} pending={passkeyBusy} disabled={isSwitching}>
            {passkeyBusy ? 'Waiting for your security key…' : 'Use security key'}
          </AuthButton>
        )}
      </div>

      {alternativeMethods.length > 0 && (
        <section className="mt-8 border-t border-[var(--border)] pt-6" aria-labelledby="mfa-alternatives">
          {showPicker ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="mfa-alternatives" className="text-[13px] font-medium text-[var(--text)]">
                  Other ways to verify
                </h2>
                <AuthTextButton onClick={() => setShowPicker(false)}>Hide</AuthTextButton>
              </div>
              <MethodList methods={alternativeMethods} disabled={busy} onSelect={selectMethod} />
            </div>
          ) : (
            <p id="mfa-alternatives" className="text-[13px] text-[var(--text2)]">
              Can&apos;t use {methodTitle(current.type).toLowerCase()}?{' '}
              <AuthTextButton onClick={() => setShowPicker(true)} disabled={busy}>
                Try another way
              </AuthTextButton>
            </p>
          )}
        </section>
      )}

      <AuthFooter>
        <AuthTextButton onClick={onCancel}>Cancel and return to sign in</AuthTextButton>
      </AuthFooter>
    </div>
  );
}
