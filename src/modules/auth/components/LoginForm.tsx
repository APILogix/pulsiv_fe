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
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px] font-medium text-[#8A8F98]">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          disabled={isPending}
          className="h-[46px] bg-[#141414] border-[#1f1f1f] text-white placeholder:text-[#5C5F66] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20 transition-all rounded-md px-4"
        />
        {errors.email && <p className="text-[#ef4444] text-xs">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[13px] font-medium text-[#8A8F98]">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password')}
            disabled={isPending}
            className="h-[46px] pr-12 bg-[#141414] border-[#1f1f1f] text-white placeholder:text-[#5C5F66] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20 transition-all rounded-md px-4"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5C5F66] hover:text-[#8A8F98] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        <div className="flex justify-between items-center mt-2">
          {errors.password ? (
            <p className="text-[#ef4444] text-xs">{errors.password.message}</p>
          ) : (
            <div />
          )}
          <Link to="/auth/forgot-password" className="text-[13px] text-[#8A8F98] hover:text-white transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-[#1f1f1f] bg-[#111111] p-3">
        <label className="flex items-start gap-3 text-[13px] text-[#8A8F98]">
          <input
            type="checkbox"
            {...register('remember_me')}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 rounded border-[#2a2a2a] bg-[#141414] accent-[#10b981]"
          />
          <span>
            <span className="block font-medium text-[#e8e8e8]">Keep me signed in</span>
            <span className="block text-[12px] text-[#5C5F66]">Use a longer refresh session on this browser.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-[13px] text-[#8A8F98]">
          <input
            type="checkbox"
            {...register('trust_device')}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 rounded border-[#2a2a2a] bg-[#141414] accent-[#10b981]"
          />
          <span>
            <span className="block font-medium text-[#e8e8e8]">Trust this device after MFA</span>
            <span className="block text-[12px] text-[#5C5F66]">Skip MFA on this device until the trust window expires.</span>
          </span>
        </label>
      </div>

      <Button
        type="submit"
        className="w-full h-[46px] mt-6 bg-[#10b981] text-black font-semibold hover:opacity-90 transition-opacity rounded-md disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" /></svg>
            Authenticating...
          </span>
        ) : 'Sign in'}
      </Button>
    </form>
  );
}
