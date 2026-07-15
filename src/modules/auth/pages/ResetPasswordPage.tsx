import { useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '../schemas/auth.schema';
import type { ResetPasswordFormData } from '../schemas/auth.schema';
import { useResetPassword } from '../hooks/useResetPassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PasswordToggle = ({ showPassword, onToggle }: { showPassword: boolean; onToggle: () => void }) => (
  <button
    type="button"
    tabIndex={-1}
    onClick={onToggle}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#999999] transition-colors"
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    )}
  </button>
);

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [params] = useSearchParams();
  const token = params.get('token');
  const { mutate: resetPassword, isPending } = useResetPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token || '' }
  });

  const onSubmit = handleSubmit((data) => {
    resetPassword(data);
  });


  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            Set a new password
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            Choose a strong password for your account.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-[#999999]">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('new_password')}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-10 pr-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
              />
              <PasswordToggle showPassword={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
            {errors.new_password && <p className="text-[#ef4444] text-xs mt-1">{errors.new_password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs text-[#999999]">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                {...register('confirm_password')}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-10 pr-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
              />
              <PasswordToggle showPassword={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
            {errors.confirm_password && <p className="text-[#ef4444] text-xs mt-1">{errors.confirm_password.message}</p>}
          </div>
          <Button type="submit" disabled={isPending} className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors">
            {isPending ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      </div>

      <div className="text-center text-sm text-[#555555]">
        <Link to="/auth/login" className="hover:text-[#999999] transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
