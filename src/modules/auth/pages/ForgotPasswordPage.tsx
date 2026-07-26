import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forgotPasswordSchema } from '../schemas/auth.schema';
import type { ForgotPasswordFormData } from '../schemas/auth.schema';
import { useForgotPassword } from '../hooks/useForgotPassword';
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
        <AuthResult
          icon={MailCheck}
          tone="green"
          title="Check your inbox"
          description="If an account exists for that address, a password reset link is on its way. The link expires in 30 minutes."
        >
          <AuthCard>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text3)]">Sent to</p>
            <p className="mt-1.5 truncate font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">
              {getValues('email')}
            </p>
            <Notice tone="blue" className="mt-4">
              Nothing yet? Check your spam folder before requesting another link.
            </Notice>
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
        eyebrow="Account recovery"
        icon={ShieldQuestion}
        title="Reset your password"
        description="Enter the email tied to your workspace and we'll send a single-use reset link."
      />

      <AuthCard>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <AuthField
            label="Work email"
            htmlFor="email"
            hint="We only send recovery links to verified addresses."
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
              className={cn(fieldInputClass, 'h-11 font-[family-name:var(--mono)] text-[13px]')}
            />
          </AuthField>

          <AuthButton type="submit" pending={isPending}>
            Send recovery link
          </AuthButton>
        </form>
      </AuthCard>

      <AuthFooter>
        Remembered it? <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
