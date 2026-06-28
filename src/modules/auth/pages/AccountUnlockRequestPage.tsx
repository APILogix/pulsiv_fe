import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { accountUnlockRequestSchema } from '../schemas/auth.schema';
import type { AccountUnlockRequestFormData } from '../schemas/auth.schema';
import { useRequestAccountUnlock } from '../hooks/useRequestAccountUnlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AccountUnlockRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate: requestUnlock, isPending } = useRequestAccountUnlock();

  const { register, handleSubmit, formState: { errors } } = useForm<AccountUnlockRequestFormData>({
    resolver: zodResolver(accountUnlockRequestSchema),
  });

  const onSubmit = handleSubmit((data) => {
    requestUnlock(data, {
      onSuccess: () => setSubmitted(true)
    });
  });

  if (submitted) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">Check your email</h2>
            <p className="text-sm text-[#999999] mt-1">
              If your account is locked, we&apos;ve sent an unlock link.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#34d399]/5 border border-[#34d399]/10 text-sm text-[#34d399]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Unlock instructions sent. Check your inbox.
          </div>
          <Link to="/auth/login">
            <Button variant="outline" className="w-full h-10 border-[#333333] bg-[#161616] text-[#e8e8e8] hover:bg-[#1e1e1e] hover:border-[#555555]">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            Unlock your account
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            Enter your email to receive an account unlock link.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-[#999999]">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="you@company.com"
              autoComplete="email"
              className="h-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
            />
            {errors.email && <p className="text-[#ef4444] text-xs mt-1">{errors.email.message}</p>}
          </div>
          <Button type="submit" disabled={isPending} className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors">
            {isPending ? 'Sending...' : 'Send unlock link'}
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
