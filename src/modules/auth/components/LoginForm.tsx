import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';
import { AuthButton, AuthField, PasswordInput, fieldInputClass } from '@/shared/ui/pulse';

interface LoginFormProps {
  login: (data: LoginFormData) => void;
  isPending: boolean;
}

const STEPS = [
  { id: 'email', label: 'Email' },
  { id: 'password', label: 'Password' },
] as const;

function StepIndicator({ step }: { step: 'email' | 'password' }) {
  const activeIndex = step === 'email' ? 0 : 1;
  return (
    <ol className="mb-1 flex items-center gap-2" aria-label={`Step ${activeIndex + 1} of 2`}>
      {STEPS.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={item.id} className="flex items-center gap-2">
            {index > 0 && <span className="h-px w-5 bg-[var(--border)]" aria-hidden="true" />}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] ring-1 ring-inset transition-colors duration-150',
                active
                  ? 'bg-[var(--brand-bg)] text-[var(--brand)] ring-[var(--brand)]/30'
                  : done
                    ? 'bg-[var(--green-bg)] text-[var(--green)] ring-[var(--green)]/25'
                    : 'bg-[var(--bg2)] text-[var(--text3)] ring-[var(--border)]'
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <span className="font-[family-name:var(--mono)] tabular-nums">{index + 1}</span>
              )}
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function LoginForm({ login, isPending }: LoginFormProps) {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  const continueToPassword = async () => {
    if (await trigger('email')) setStep('password');
  };

  return (
    <form onSubmit={handleSubmit(login)} className="flex flex-col gap-4">
      <StepIndicator step={step} />

      {step === 'email' ? (
        <>
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
              className={cn(fieldInputClass, 'h-10 font-[family-name:var(--mono)] text-[13px]')}
            />
          </AuthField>

          <p className="border-t border-[var(--border)] pt-4 text-[12px] leading-5 text-[var(--text3)]">
            By continuing, you agree to Pulsiv&apos;s Terms and Conditions and Privacy Policy.
          </p>

          <AuthButton type="button" onClick={continueToPassword} disabled={isPending}>
            Continue
          </AuthButton>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Signing in as</p>
              <span className="mt-0.5 block min-w-0 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
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
        </>
      )}
    </form>
  );
}
