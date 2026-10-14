import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { accountUnlockRequestSchema } from '../schemas/auth.schema';
import type { AccountUnlockRequestFormData } from '../schemas/auth.schema';
import { useRequestAccountUnlock } from '../hooks/useRequestAccountUnlock';
import {
  AuthButton,
  AuthFact,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthNote,
  AuthTextButton,
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
        <AuthHeading
          title="Check your inbox"
          description="If this account is locked, an unlock link is on its way. The link works once and expires shortly."
        />

        <AuthFact
          label="Sent to"
          value={getValues('email')}
          action={<AuthTextButton onClick={() => setSubmitted(false)}>Change</AuthTextButton>}
        />

        <AuthFooter>
          <AuthLink to="/auth/login">Back to sign in</AuthLink>
        </AuthFooter>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        title="Unlock your account"
        description="Accounts lock after repeated failed sign-in attempts. We'll email you a link to lift the lock."
      />

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
            className={cn(fieldInputClass, 'h-11 text-[14px]')}
          />
        </AuthField>

        <AuthButton type="submit" pending={isPending}>
          Send unlock link
        </AuthButton>
      </form>

      <AuthNote className="mt-4">Locks also clear on their own once the cooldown window ends.</AuthNote>

      <AuthFooter>
        Forgot your password instead? <AuthLink to="/auth/forgot-password">Reset it</AuthLink>
      </AuthFooter>
    </div>
  );
}
