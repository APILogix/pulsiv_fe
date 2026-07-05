import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { HelpCircle, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function MfaRecoveryPanel() {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const requestRecovery = useMutation({
    mutationFn: () => authApi.requestMfaRecovery({ reason: reason.trim() }),
    onSuccess: () => {
      setSubmitted(true);
      toast.success('MFA recovery request submitted');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h1 className="mb-2 text-[24px] font-semibold text-white tracking-normal">MFA recovery</h1>
        <p className="text-[14px] leading-relaxed text-[#8A8F98]">
          Request recovery review if you cannot use your configured MFA methods or backup codes.
        </p>
      </div>

      <section className="rounded-lg border border-[#1f1f1f] bg-[#141414]">
        <div className="border-b border-[#1f1f1f] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#3a2e16] bg-[#211a0f] text-[#eab308]">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-white">Recovery review</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#8A8F98]">
                This is for account recovery, not a shortcut around MFA. Provide enough context for support review.
              </p>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="p-6">
            <div className="flex items-start gap-3 rounded-lg border border-[#10b981]/20 bg-[#10b981]/10 p-4 text-[#10b981]">
              <HelpCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-[14px] leading-relaxed">
                Recovery request submitted. Watch your verified email for next steps.
              </p>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              requestRecovery.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="mfa-recovery-reason" className="text-[#8A8F98]">Recovery details</Label>
              <Textarea
                id="mfa-recovery-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value.slice(0, 1000))}
                minLength={20}
                maxLength={1000}
                placeholder="Explain what happened and which MFA methods you can no longer access"
                className="min-h-[160px] resize-none bg-[#0c0c0c] border-[#262626] text-white"
              />
              <div className="flex justify-between text-xs text-[#5C5F66]">
                <span>Minimum 20 characters</span>
                <span>{reason.length}/1000</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={requestRecovery.isPending || reason.trim().length < 20}
                className="bg-white text-black hover:bg-[#e8e8e8]"
              >
                {requestRecovery.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Request recovery
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
