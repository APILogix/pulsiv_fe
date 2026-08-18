import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accountUnlockRequestSchema } from '../schemas/auth.schema';
import type { AccountUnlockRequestFormData } from '../schemas/auth.schema';
import { useRequestAccountUnlock } from '../hooks/useRequestAccountUnlock';
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthResult,
  Notice,
  fieldInputClass,
} from '@/shared/ui/pulse';

export default function AccountUnlockRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate: requestUnlock, isPending } = useRequestAccountUnlock();

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<AccountUnlockRequestFormData>({
    resolver: zodResolver(accountUnlockRequestSchema),
  });

  const onSubmit = handleSubmit((data) => {
    requestUnlock(data, {
      onSuccess: () => setSubmitted(true)
    });
  });

  if (submitted) {
    return (
      <div className="w-full">
        <AuthResult
          icon={MailCheck}
          tone="green"
          title="Check your inbox"
          description="If the account is locked, an unlock link is on its way. The link works once and expires shortly."
        >
          <AuthCard>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text3)]">Sent to</p>
            <p className="mt-1.5 truncate font-mono text-[13px] text-[var(--text)]">
              {getValues('email')}
            </p>
          </AuthCard>
        </AuthResult>

        <AuthFooter>
          <AuthLink to="/auth/login">Back to sign in</AuthLink>
        </AuthFooter>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Account defense"
        icon={LockKeyhole}
        tone="amber"
        title="Unlock your account"
        description="Accounts lock automatically after repeated failed sign-in attempts. We'll email you a link to lift the lock."
      />

      <AuthCard>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <AuthField
            label="Work email"
            htmlFor="email"
            error={errors.email ? 'Enter a valid email address.' : undefined}
          >
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
              {...register('email')}
              disabled={isPending}
              className={cn(fieldInputClass, 'h-10 font-mono text-[13px]')}
            />
          </AuthField>

          <AuthButton type="submit" pending={isPending}>
            Send unlock link
          </AuthButton>
        </form>

        <Notice tone="amber" className="mt-4">
          Locks also clear on their own after the cooldown window ends.
        </Notice>
      </AuthCard>

      <AuthFooter>
        Password trouble instead? <AuthLink to="/auth/forgot-password">Reset your password</AuthLink>
      </AuthFooter>
    </div>
  );
}
