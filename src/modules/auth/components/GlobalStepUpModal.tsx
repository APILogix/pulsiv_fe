import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { authApi } from '@/modules/auth/api/auth.api';
import { mfaVerifyStepUpSchema, type MfaVerifyStepUpFormData } from '@/modules/auth/schemas/auth.schema';
import type { MFAChallenge } from '@/modules/auth/types/auth.types';
import { stepUpWithPasskey, WebAuthnCeremonyError } from '@/modules/auth/services/webauthn.client';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export function GlobalStepUpModal() {
  const { stepUpPromise, resolveStepUp, rejectStepUp } = useAuthStore();
  const isOpen = !!stepUpPromise;
  
  const [challenge, setChallenge] = useState<MFAChallenge | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const isPasskey = challenge?.device_type === 'hardware_key';
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<MfaVerifyStepUpFormData>({
    resolver: zodResolver(mfaVerifyStepUpSchema),
    defaultValues: {
      challenge_id: '',
      code: '',
    }
  });

  // When modal opens, create a challenge
  useEffect(() => {
    if (isOpen) {
      reset();
      setChallenge(null);
      setIsResending(false);
      authApi.requestMFAChallenge()
        .then((data: MFAChallenge) => {
          setChallenge(data);
          setValue('challenge_id', data.challenge_id);
        })
        .catch((err: any) => {
          toast.error("Failed to initiate security challenge");
          rejectStepUp(err);
        });
    }
  }, [isOpen, reset, setValue, rejectStepUp]);

  const handleResend = async () => {
    if (!challenge || challenge.device_type !== 'email') return;
    setIsResending(true);
    try {
      await authApi.resendEmailMfaOtp(challenge.device_id);
      toast.success('Verification code sent');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to send verification code');
    } finally {
      setIsResending(false);
    }
  };

  const verifyMutation = useMutation({
    mutationFn: (data: MfaVerifyStepUpFormData) => authApi.verifyMFAChallenge(data),
    onSuccess: () => {
      resolveStepUp();
      toast.success("Identity verified");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || "Invalid code";
      toast.error(msg);
    }
  });

  async function handlePasskeyStepUp() {
    if (!challenge) return;
    setPasskeyBusy(true);
    try {
      await stepUpWithPasskey(challenge.challenge_id);
      resolveStepUp();
      toast.success('Identity verified');
    } catch (err) {
      const msg = err instanceof WebAuthnCeremonyError ? err.message : 'Security key verification failed';
      toast.error(msg);
    } finally {
      setPasskeyBusy(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      rejectStepUp(new Error('MFA verification cancelled'));
    }
  };

  const onSubmit = handleSubmit((data) => {
    verifyMutation.mutate(data);
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
        <DialogHeader>
          <DialogTitle>Security Verification</DialogTitle>
          <DialogDescription className="text-[var(--text3)]">
            {isPasskey
              ? 'Use your security key or passkey to verify your identity.'
              : challenge?.device_type === 'email'
              ? 'Enter the 6-digit code sent to your email.'
              : 'Enter your 6-digit authenticator code to continue.'}
          </DialogDescription>
        </DialogHeader>

        {!challenge ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[var(--brand)]" size={24} />
          </div>
        ) : isPasskey ? (
          <div className="space-y-4 pt-4">
            <Button
              type="button"
              onClick={handlePasskeyStepUp}
              disabled={passkeyBusy}
              className="w-full h-11 bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-hover)] hover:text-[var(--brand-fg)] flex items-center justify-center gap-2"
            >
              {passkeyBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for security key…</> : <><KeyRound size={16} /> Use security key</>}
            </Button>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-4">
            <input type="hidden" {...register('challenge_id')} />
            {challenge.device_type === 'email' && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-[var(--text2)]">
                  <Mail size={16} className="text-[var(--brand)]" />
                  Email code sent
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={isResending}
                  className="border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg1)] hover:text-[var(--text)]"
                >
                  {isResending ? 'Sending...' : 'Resend'}
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="code" className="text-[var(--text2)]">Verification Code</Label>
              <Input
                id="code"
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                {...register('code')}
                className="font-[family-name:var(--mono)] tracking-widest text-lg h-12 text-center border-[var(--border)] bg-[var(--bg2)]"
                autoFocus
              />
              {errors.code && (
                <p className="text-xs text-red-500">{errors.code.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-4 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                className="border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={verifyMutation.isPending}
                className="bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-hover)] hover:text-[var(--brand-fg)]"
              >
                {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Continue
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
