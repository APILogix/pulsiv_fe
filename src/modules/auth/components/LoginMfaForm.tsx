import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Smartphone, Mail, KeyRound, ShieldCheck, Loader2, ChevronRight } from 'lucide-react';
import { loginMfaSchema } from '../schemas/auth.schema';
import type { LoginMfaFormData } from '../schemas/auth.schema';
import type { LoginMfaMethod, MFAType } from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { loginWithPasskey, WebAuthnCeremonyError } from '../services/webauthn.client';
import { completeLogin } from '../services/post-login';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function methodTitle(type: MFAType): string {
  return METHOD_LABEL[type] ?? 'Verification';
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

  const methods = useMemo<LoginMfaMethod[]>(
    () => availableMethods ?? [],
    [availableMethods],
  );

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LoginMfaFormData>({
    resolver: zodResolver(loginMfaSchema),
    defaultValues: { challenge_id: challengeId || '', code: '' },
  });

  const isCodeMethod = current.type === 'totp' || current.type === 'email' || current.type === 'sms';
  const isPasskey = current.type === 'hardware_key';

  const onSubmit = handleSubmit((data) => {
    loginMfa({ ...data, challenge_id: challengeId! });
  });

  // Complete login once a passkey assertion succeeds.
  // WebAuthn verify returns raw tokens (no embedded user), so completeLogin
  // will fall through to getCurrentUser() automatically.
  async function runPasskey() {
    if (!challengeId) return;
    setPasskeyBusy(true);
    try {
      const session = await loginWithPasskey(challengeId);
      await completeLogin(session, { setAuth, queryClient, navigate });
    } catch (err) {
      const msg = err instanceof WebAuthnCeremonyError ? err.message : getErrorMessage(err);
      toast.error(msg);
    } finally {
      setPasskeyBusy(false);
    }
  }

  // Auto-trigger the passkey ceremony when the primary method is a security key.
  useEffect(() => {
    if (isPasskey && challengeId && !autoPasskeyStarted.current) {
      autoPasskeyStarted.current = true;
      void runPasskey();
    }
    // StrictMode re-runs effects in development. The ref prevents two
    // concurrent WebAuthn ceremonies, which causes the browser to cancel one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      reset({ challenge_id: challengeId || '', code: '' });
      if (method.type === 'email') {
        toast.success('Verification code sent to your email');
      } else if (method.type === 'sms') {
        toast.success('Verification code sent via text message');
      } else if (method.type === 'hardware_key') {
        await runPasskey();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSwitching(false);
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function resendEmailCode() {
    if (current.type !== 'email' || !current.id || current.id === 'primary' || resendCooldown > 0) return;
    setIsResending(true);
    try {
      await authApi.resendEmailMfaOtp(current.id);
      setResendCooldown(30);
      toast.success('Verification code sent');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  }

  if (!challengeId) {
    onCancel();
    return null;
  }

  const CurrentIcon = METHOD_ICON[current.type] ?? ShieldCheck;
  const alternativeMethods = methods.filter((m) => m.id !== current.id);

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
          Two-factor verification
        </h2>
        <p className="text-sm text-[#999999]">
          {current.type === 'totp' && 'Enter the 6-digit code from your authenticator app.'}
          {(current.type === 'email') && 'Enter the 6-digit code sent to your email.'}
          {(current.type === 'sms') && 'Enter the 6-digit code sent to your phone.'}
          {isPasskey && 'Use your security key or passkey to continue.'}
        </p>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8">
        {/* Active method banner */}
        <div className="flex items-center gap-3 mb-6 rounded-lg border border-[#1f1f1f] bg-[#161616] px-3 py-2.5">
          <div className="w-9 h-9 rounded-md bg-[#0c0c0c] border border-[#262626] flex items-center justify-center text-[#34d399] shrink-0">
            <CurrentIcon size={18} className="stroke-[1.5]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-[#e8e8e8] truncate">{current.name || methodTitle(current.type)}</p>
            <p className="text-xs text-[#777777] truncate">
              {current.display_hint || methodTitle(current.type)}
            </p>
          </div>
        </div>

        {isCodeMethod && (
          <form onSubmit={onSubmit} className="space-y-5">
            <input type="hidden" {...register('challenge_id')} />
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs text-[#999999]">Verification code</Label>
              <Input
                id="code"
                maxLength={6}
                {...register('code')}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                className="h-12 font-mono text-center tracking-[0.3em] text-lg bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
              />
              {errors.code && <p className="text-[#ef4444] text-xs mt-1">{errors.code.message}</p>}
            </div>
            <Button
              type="submit"
              disabled={isPending || isSwitching}
              className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors"
            >
              {isPending ? 'Verifying...' : 'Verify identity'}
            </Button>
            {current.type === 'email' && current.id !== 'primary' && (
              <button
                type="button"
                onClick={resendEmailCode}
                disabled={isResending || resendCooldown > 0}
                className="w-full text-center text-sm text-[#34d399] hover:text-[#10b981] transition-colors disabled:text-[#555555]"
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
              </button>
            )}
          </form>
        )}

        {isPasskey && (
          <Button
            onClick={runPasskey}
            disabled={passkeyBusy || isSwitching}
            className="w-full h-11 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors flex items-center justify-center gap-2"
          >
            {passkeyBusy ? (
              <><Loader2 size={16} className="animate-spin" /> Waiting for security key…</>
            ) : (
              <><KeyRound size={16} /> Use security key</>
            )}
          </Button>
        )}
      </div>

      {/* Try another way */}
      {alternativeMethods.length > 0 && (
        <div className="space-y-2">
          {!showPicker ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full text-center text-sm text-[#34d399] hover:text-[#10b981] transition-colors"
            >
              Try another way
            </button>
          ) : (
            <div className="space-y-2 rounded-xl border border-[#262626] bg-[#111111]/80 p-3">
              <p className="text-xs text-[#777777] px-1 pb-1">Choose how to verify your identity</p>
              {alternativeMethods.map((m) => {
                const Icon = METHOD_ICON[m.type] ?? ShieldCheck;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isSwitching || passkeyBusy}
                    onClick={() => selectMethod(m)}
                    className="w-full flex items-center gap-3 rounded-lg border border-[#1f1f1f] bg-[#161616] px-3 py-2.5 text-left hover:border-[#34d399]/40 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-md bg-[#0c0c0c] border border-[#262626] flex items-center justify-center text-[#8A8F98] shrink-0">
                      <Icon size={18} className="stroke-[1.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#e8e8e8] truncate">
                        {m.name || methodTitle(m.type)}
                        {m.is_primary && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-[#34d399]">Primary</span>
                        )}
                      </p>
                      <p className="text-xs text-[#777777] truncate">
                        {m.display_hint || methodTitle(m.type)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#555555] shrink-0" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="w-full text-center text-xs text-[#555555] hover:text-[#999999] transition-colors pt-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-sm text-[#555555] pt-2">
        <button type="button" onClick={onCancel} className="hover:text-[#999999] transition-colors">
          Back to sign in
        </button>
      </div>
    </div>
  );
}
