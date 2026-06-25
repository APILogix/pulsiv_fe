import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);

  const PasswordToggle = () => (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => setShowPassword((v) => !v)}
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
        <form className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-[#999999]">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-10 pr-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
              />
              <PasswordToggle />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs text-[#999999]">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-10 pr-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
              />
              <PasswordToggle />
            </div>
          </div>
          <Button type="submit" className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors">
            Reset password
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
