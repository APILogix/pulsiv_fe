import { Link } from 'react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '../schemas/auth.schema';
import type { ForgotPasswordFormData } from '../schemas/auth.schema';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
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
        <Link to="/auth/login" className="inline-flex items-center gap-2 text-[#8A8F98] text-[13px] hover:text-white transition-colors mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to sign in
        </Link>

        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-2">Check your email</h1>
          <p className="text-[14px] text-[#8A8F98] leading-relaxed">
            If an account exists with that email, we've sent a password reset link.
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[14px] text-[#10b981]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Reset link sent. Check your inbox and spam folder.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Link to="/auth/login" className="inline-flex items-center gap-2 text-[#8A8F98] text-[13px] hover:text-white transition-colors mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to sign in
      </Link>

      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-white mb-2">
          Reset password
        </h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">
          Enter your email and we'll send you instructions to reset your password.
        </p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="block text-[13px] font-medium text-[#8A8F98]">Email Address</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="you@company.com"
            autoComplete="email"
            className="w-full h-auto bg-[#141414] border border-[#1f1f1f] text-white text-[14px] px-4 py-3 rounded-lg outline-none transition-all placeholder:text-[#5C5F66] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20"
          />
          {errors.email && <p className="text-[#ef4444] text-xs mt-1">{errors.email.message}</p>}
        </div>
        <Button type="submit" disabled={isPending} className="w-full h-auto bg-[#10b981] hover:bg-[#10b981]/90 text-black text-[14px] font-semibold py-3 rounded-lg transition-opacity disabled:opacity-50 border-none">
          {isPending ? 'Sending...' : 'Send Recovery Link'}
        </Button>
      </form>
    </div>
  );
}
