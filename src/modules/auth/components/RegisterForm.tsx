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
  const [passwordValue, setPasswordValue] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    registerUser(data);
  };

  const getStrengthLevel = (val: string) => {
    let strength = 0;
    if (val.length > 0) strength = 1;
    if (val.length >= 6) strength = 2;
    if (val.length >= 8 && /[0-9]/.test(val)) strength = 3;
    if (val.length >= 10 && /[^A-Za-z0-9]/.test(val)) strength = 4;
    return strength;
  };

  const strength = getStrengthLevel(passwordValue);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name" className="block text-[13px] font-medium text-[#8A8F98]">Full Name</Label>
        <Input
          id="full_name"
          placeholder="Jane Doe"
          autoComplete="name"
          {...register('full_name')}
          disabled={isPending}
          className="w-full h-auto bg-[#141414] border border-[#1f1f1f] text-white text-[14px] px-4 py-3 rounded-lg outline-none transition-all placeholder:text-[#5C5F66] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20"
        />
        {errors.full_name && <p className="text-[#ef4444] text-xs mt-1">{errors.full_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="block text-[13px] font-medium text-[#8A8F98]">Work Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          disabled={isPending}
          className="w-full h-auto bg-[#141414] border border-[#1f1f1f] text-white text-[14px] px-4 py-3 rounded-lg outline-none transition-all placeholder:text-[#5C5F66] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20"
        />
        {errors.email && <p className="text-[#ef4444] text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="block text-[13px] font-medium text-[#8A8F98]">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            autoComplete="new-password"
            {...register('password')}
            onChange={(e) => {
              register('password').onChange(e);
              setPasswordValue(e.target.value);
            }}
            disabled={isPending}
            className="w-full h-auto pr-10 bg-[#141414] border border-[#1f1f1f] text-white text-[14px] px-4 py-3 rounded-lg outline-none transition-all placeholder:text-[#5C5F66] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5F66] hover:text-[#8A8F98] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        <div className="flex gap-1 mt-2">
          <div className={`h-1 flex-1 rounded-full transition-all ${strength >= 1 ? (strength === 1 ? 'bg-[#ef4444]' : strength === 2 ? 'bg-[#f59e0b]' : 'bg-[#10b981]') : 'bg-[#1f1f1f]'}`}></div>
          <div className={`h-1 flex-1 rounded-full transition-all ${strength >= 2 ? (strength === 2 ? 'bg-[#f59e0b]' : 'bg-[#10b981]') : 'bg-[#1f1f1f]'}`}></div>
          <div className={`h-1 flex-1 rounded-full transition-all ${strength >= 3 ? 'bg-[#10b981]' : 'bg-[#1f1f1f]'}`}></div>
          <div className={`h-1 flex-1 rounded-full transition-all ${strength >= 4 ? 'bg-[#10b981]' : 'bg-[#1f1f1f]'}`}></div>
        </div>
        {errors.password && <p className="text-[#ef4444] text-xs mt-1">{errors.password.message}</p>}
      </div>

      <div className="space-y-2.5 pt-2">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="accept_terms"
            {...register('accept_terms')}
            className="h-3.5 w-3.5 mt-0.5 rounded border-[#1f1f1f] bg-[#141414] accent-[#10b981] cursor-pointer"
          />
          <label htmlFor="accept_terms" className="text-xs text-[#8A8F98] cursor-pointer leading-relaxed">
            I agree to the <a href="#" className="text-[#10b981] hover:underline">Terms of Service</a>
          </label>
        </div>
        {errors.accept_terms && <p className="text-[#ef4444] text-xs">{errors.accept_terms.message}</p>}

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="accept_privacy"
            {...register('accept_privacy')}
            className="h-3.5 w-3.5 mt-0.5 rounded border-[#1f1f1f] bg-[#141414] accent-[#10b981] cursor-pointer"
          />
          <label htmlFor="accept_privacy" className="text-xs text-[#8A8F98] cursor-pointer leading-relaxed">
            I agree to the <a href="#" className="text-[#10b981] hover:underline">Privacy Policy</a>
          </label>
        </div>
        {errors.accept_privacy && <p className="text-[#ef4444] text-xs">{errors.accept_privacy.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full h-auto mt-2 bg-[#10b981] hover:bg-[#10b981]/90 text-black text-[14px] font-semibold py-3 rounded-lg transition-opacity disabled:opacity-50 border-none"
        disabled={isPending}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" /></svg>
            Creating account...
          </span>
        ) : 'Create Account'}
      </Button>
    </form>
  );
}
