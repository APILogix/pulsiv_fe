import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  login: (data: LoginFormData) => void;
  isPending: boolean;
}

export function LoginForm({ login, isPending }: LoginFormProps) {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  const continueToPassword = async () => {
    if (await trigger('email')) setStep('password');
  };

  return (
    <form onSubmit={handleSubmit(login)} className="space-y-4">
      {step === 'email' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" autoFocus {...register('email')} disabled={isPending} className="h-12 rounded-[8px] border-[var(--border)] bg-[var(--bg2)] px-4 text-[var(--text)] placeholder:text-[var(--text3)] focus-visible:border-[var(--brand)] focus-visible:ring-[color:color-mix(in_srgb,var(--ring)_35%,transparent)]" />
            <p className="text-[13px] text-[var(--text2)]">Enter your work email to continue.</p>
            {errors.email && <p className="text-xs text-[var(--red)]">Enter a valid email address.</p>}
          </div>

          <p className="border-t border-[var(--border)] pt-4 text-left text-[12px] leading-5 text-[var(--text3)]">
            By continuing, you agree to Pulsiv&apos;s Terms and Conditions and Privacy Policy.
          </p>

          <Button type="button" onClick={continueToPassword} disabled={isPending} className="mt-2 h-12 w-full rounded-[8px] bg-[var(--brand)] font-semibold text-[var(--brand-fg)] hover:bg-[var(--brand-d)] disabled:opacity-50">Continue</Button>
        </>
      ) : (
        <>
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">Email</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-[var(--text)]">{getValues('email')}</span>
              <button type="button" onClick={() => setStep('email')} disabled={isPending} className="shrink-0 text-[13px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-d)] disabled:opacity-50">Change</button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" autoFocus {...register('password')} disabled={isPending} className="h-12 rounded-[8px] border-[var(--border)] bg-[var(--bg2)] px-4 pr-12 text-[var(--text)] placeholder:text-[var(--text3)] focus-visible:border-[var(--brand)] focus-visible:ring-[color:color-mix(in_srgb,var(--ring)_35%,transparent)]" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text3)] transition-colors hover:text-[var(--text2)]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            <p className="text-[13px] text-[var(--text2)]">Enter your password to sign in.</p>
            {errors.password && <p className="text-xs text-[var(--red)]">Enter your password.</p>}
            <div>
              <Link to="/auth/forgot-password" className="text-[13px] text-[var(--text3)] transition-colors hover:text-[var(--text)]">Forgot password?</Link>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="mt-2 h-12 w-full rounded-[8px] bg-[var(--brand)] font-semibold text-[var(--brand-fg)] hover:bg-[var(--brand-d)] disabled:opacity-50">
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </>
      )}
    </form>
  );
}
