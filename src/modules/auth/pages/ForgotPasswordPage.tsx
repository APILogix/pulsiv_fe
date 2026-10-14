import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { forgotPasswordSchema } from '../schemas/auth.schema';
import type { ForgotPasswordFormData } from '../schemas/auth.schema';
import { useForgotPassword } from '../hooks/useForgotPassword';
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

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit((data) => {
    forgotPassword(data, {
      onSuccess: () => setSubmitted(true)
    });
  });

  if (submitted) {
    return (
      <div className="w-full">
        <AuthHeading
          title="Check your inbox"
          description="If an account exists for this address, a reset link is on its way. It expires in 30 minutes."
        />

        <AuthFact
          label="Sent to"
          value={getValues('email')}
          action={<AuthTextButton onClick={() => setSubmitted(false)}>Change</AuthTextButton>}
        />

        <AuthNote className="mt-4">
          Nothing after a few minutes? Check spam, then send another link from this page.
        </AuthNote>

        <AuthFooter>
          <AuthLink to="/auth/login">Back to sign in</AuthLink>
        </AuthFooter>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        title="Reset your password"
        description="Enter the email you sign in with and we'll send a single-use reset link."
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
          Send reset link
        </AuthButton>
      </form>

      <AuthFooter>
        Remembered it? <AuthLink to="/auth/login">Back to sign in</AuthLink>
        <br />
        Account locked after too many attempts? <AuthLink to="/auth/unlock">Unlock it</AuthLink>
      </AuthFooter>
    </div>
  );
}
