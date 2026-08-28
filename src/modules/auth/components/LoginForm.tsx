import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';
import { AuthButton, AuthField, PasswordInput, fieldInputClass } from '@/shared/ui/pulse';

interface LoginFormProps {
  login: (data: LoginFormData) => void;
  isPending: boolean;
  /**
   * Called with the validated address when the user advances to the password
   * step. This is the hook the workspace lookup hangs off — the email step tells
   * the user "we use this to find your workspace", so something has to actually
   * perform that lookup.
   */
  onEmailResolved?: (email: string) => void;
  /** True while the workspace lookup is in flight, to keep Continue honest. */
  isResolving?: boolean;
  /**
   * Rendered above the password field. Owned by the page so this component stays
   * presentational and does not need to know about SSO or social providers.
   */
  passwordStepSlot?: React.ReactNode;
}

export function LoginForm({
  login,
  isPending,
  onEmailResolved,
  isResolving = false,
  passwordStepSlot,
}: LoginFormProps) {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  const continueToPassword = async () => {
    if (!(await trigger('email'))) return;
    setStep('password');
    onEmailResolved?.(getValues('email'));
  };

  return (
    <form onSubmit={handleSubmit(login)} className="flex flex-col gap-4">

      {step === 'email' ? (
        <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
          <AuthField
            label="Work email"
            htmlFor="email"
            hint="We use this to find your workspace."
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

          <p className="border-t border-[var(--border)] pt-4 text-[12px] leading-5 text-[var(--text3)]">
            By continuing, you agree to Sentinel&apos;s Terms and Conditions and Privacy Policy.
          </p>

          <AuthButton type="button" onClick={continueToPassword} disabled={isPending} pending={isResolving}>
            Continue
          </AuthButton>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Signing in as</p>
              <span className="mt-0.5 block min-w-0 truncate font-mono text-[12px] text-[var(--text)]">
                {getValues('email')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep('email')}
              disabled={isPending}
              className="shrink-0 rounded-sm text-[12px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] disabled:opacity-50"
            >
              Change
            </button>
          </div>

          {passwordStepSlot}

          <AuthField
            label="Password"
            htmlFor="password"
            error={errors.password ? 'Enter your password.' : undefined}
            trailing={
              <Link
                to="/auth/forgot-password"
                className="rounded-sm text-[12px] font-medium text-[var(--text3)] transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]"
              >
                Forgot password?
              </Link>
            }
          >
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              autoFocus
              {...register('password')}
              disabled={isPending}
            />
          </AuthField>

          <AuthButton type="submit" pending={isPending}>
            Sign in
          </AuthButton>
        </div>
      )}
    </form>
  );
}
