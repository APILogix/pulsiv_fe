import { useActionState, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ChevronRight, KeyRound, Mail, ShieldCheck, Smartphone } from 'lucide-react';
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
  AuthCard,
  AuthField,
  AuthFooter,
  AuthHeading,
  CodeInput,
  IconChip,
  Pill,
  type SurfaceTone,
} from '@/shared/ui/pulse';
import { toast } from 'sonner';

const METHOD_ICON: Record<string, typeof Smartphone> = {
  totp: Smartphone,
  email: Mail,
  hardware_key: KeyRound,
  backup_codes: ShieldCheck,
  sms: Smartphone,
};

const METHOD_LABEL: Record<string, string> = {
  totp: 'Authenticator app',
  email: 'Email code',
  hardware_key: 'Security key',
  sms: 'Text message',
  backup_codes: 'Backup code',
};

const METHOD_DESCRIPTION: Record<string, string> = {
  totp: 'Enter the 6-digit code from your authenticator app.',
  email: 'Enter the 6-digit code sent to your email.',
  sms: 'Enter the 6-digit code sent to your phone.',
  hardware_key: 'Use your security key or passkey to continue.',
  backup_codes: 'Enter one of your single-use recovery codes.',
};

const METHOD_TONE: Record<string, SurfaceTone> = {
  totp: 'brand',
  email: 'blue',
  sms: 'blue',
  hardware_key: 'ai',
  backup_codes: 'amber',
};

function methodTitle(type: MFAType): string {
  return METHOD_LABEL[type] ?? 'Verification';
}

function methodTone(type: MFAType): SurfaceTone {
  return METHOD_TONE[type] ?? 'brand';
}

// One-off: the active-factor banner shown at the top of the challenge card.
function ActiveMethod({ method }: { method: LoginMfaMethod }) {
  const Icon = METHOD_ICON[method.type] ?? ShieldCheck;
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
      <IconChip icon={Icon} tone={methodTone(method.type)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--text)]">
          {method.name || methodTitle(method.type)}
        </p>
        <p className="truncate text-[12px] text-[var(--text3)]">
          {method.display_hint || methodTitle(method.type)}
        </p>
      </div>
      <Pill tone={methodTone(method.type)}>{methodTitle(method.type)}</Pill>
    </div>
  );
}

// One-off: a selectable alternative factor row.
function MethodOption({
  method,
  disabled,
  onSelect,
}: {
  method: LoginMfaMethod;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = METHOD_ICON[method.type] ?? ShieldCheck;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5 text-left transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <IconChip icon={Icon} tone="neutral" size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] text-[var(--text)]">{method.name || methodTitle(method.type)}</span>
          {method.is_primary && <Pill tone="green">Primary</Pill>}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[var(--text3)]">
          {method.display_hint || methodTitle(method.type)}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-[var(--text3)]" aria-hidden="true" />
    </button>
  );
}

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

  // Auto-trigger the passkey ceremony when the primary method is a security key.
  useEffect(() => {
    if (!challengeId) {
      onCancel();
    }
  }, [challengeId, onCancel]);

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
  const backupMethod = methods.find((m) => m.type === 'backup_codes');

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Security check"
        icon={ShieldCheck}
        title="Two-factor verification"
        description={METHOD_DESCRIPTION[current.type] ?? 'Confirm your identity to finish signing in.'}
      />

      <AuthCard>
        <ActiveMethod method={current} />

        {isCodeMethod && (
          <form action={submitCode} className="mt-5 flex flex-col gap-4">
            <AuthField label="Verification code" error={codeError ?? undefined}>
              <CodeInput key={current.id} name="code" autoFocus disabled={isPending || isSwitching} />
            </AuthField>

            <AuthButton type="submit" pending={isPending} disabled={isSwitching}>
              Verify identity
            </AuthButton>

            {current.type === 'email' && current.id !== 'primary' && (
              <button
                type="button"
                onClick={resendEmailCode}
                disabled={isResending || resendCooldown > 0}
                className="rounded-sm text-center text-[12.5px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:text-[var(--text3)]"
              >
                {isResending
                  ? 'Sending…'
                  : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
              </button>
            )}
          </form>
        )}

        {isPasskey && (
          <div className="mt-5">
            <AuthButton type="button" onClick={runPasskey} pending={passkeyBusy} disabled={isSwitching}>
              {passkeyBusy ? 'Waiting for security key…' : 'Use security key'}
            </AuthButton>
          </div>
        )}

        {(backupMethod || alternativeMethods.length > 0) && (
          <div className="mt-5 flex flex-col gap-2.5 border-t border-[var(--border)] pt-4">
            {backupMethod && backupMethod.id !== current.id && (
              <AuthButton
                type="button"
                variant="ghost"
                onClick={onSelectBackupCodes}
                disabled={isSwitching || passkeyBusy}
              >
                Use a backup code
              </AuthButton>
            )}

            {alternativeMethods.length > 0 && !showPicker && (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="rounded-sm text-center text-[12.5px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Try another way
              </button>
            )}

            {alternativeMethods.length > 0 && showPicker && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                  Choose how to verify
                </p>
                {alternativeMethods.map((m) => (
                  <MethodOption
                    key={m.id}
                    method={m}
                    disabled={isSwitching || passkeyBusy}
                    onSelect={() => selectMethod(m)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="rounded-sm pt-1 text-center text-[12px] text-[var(--text3)] transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </AuthCard>

      <AuthFooter>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Cancel and return to sign in
        </button>
      </AuthFooter>
    </div>
  );
}
