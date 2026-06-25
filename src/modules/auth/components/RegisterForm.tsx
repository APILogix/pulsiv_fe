import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schema';
import { useRegister } from '../hooks/useRegister';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  const { mutate: registerUser, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    registerUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="full_name" className="text-xs text-[#999999]">Full name</Label>
        <Input
          id="full_name"
          placeholder="Jane Doe"
          autoComplete="name"
          {...register('full_name')}
          disabled={isPending}
          className="h-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
        />
        {errors.full_name && <p className="text-[#ef4444] text-xs mt-1">{errors.full_name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs text-[#999999]">Work email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          disabled={isPending}
          className="h-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
        />
        {errors.email && <p className="text-[#ef4444] text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs text-[#999999]">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register('password')}
            disabled={isPending}
            className="h-10 pr-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
          />
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
        </div>
        {errors.password && <p className="text-[#ef4444] text-xs mt-1">{errors.password.message}</p>}
      </div>

      {/* Terms acceptance */}
      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="accept_terms"
            {...register('accept_terms')}
            className="h-3.5 w-3.5 mt-0.5 rounded border-[#333333] bg-[#161616] accent-[#34d399] cursor-pointer"
          />
          <label htmlFor="accept_terms" className="text-xs text-[#999999] cursor-pointer leading-relaxed">
            I agree to the <a href="#" className="text-[#34d399] hover:underline">Terms of Service</a>
          </label>
        </div>
        {errors.accept_terms && <p className="text-[#ef4444] text-xs">{errors.accept_terms.message}</p>}

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="accept_privacy"
            {...register('accept_privacy')}
            className="h-3.5 w-3.5 mt-0.5 rounded border-[#333333] bg-[#161616] accent-[#34d399] cursor-pointer"
          />
          <label htmlFor="accept_privacy" className="text-xs text-[#999999] cursor-pointer leading-relaxed">
            I agree to the <a href="#" className="text-[#34d399] hover:underline">Privacy Policy</a>
          </label>
        </div>
        {errors.accept_privacy && <p className="text-[#ef4444] text-xs">{errors.accept_privacy.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" /></svg>
            Creating account...
          </span>
        ) : 'Create account'}
      </Button>
    </form>
  );
}
