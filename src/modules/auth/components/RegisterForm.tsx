import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schema';
import { useRegister } from '../hooks/useRegister';
import {
  AuthButton,
  AuthField,
  PasswordInput,
  PasswordStrength,
  fieldInputClass,
} from '@/shared/ui/pulse';

const CHECKBOX_CLASS =
  'mt-0.5 size-3.5 shrink-0 cursor-pointer rounded border-[var(--border)] bg-[var(--bg2)] accent-[var(--brand)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]';

export function RegisterForm() {
  const { mutate: registerUser, isPending } = useRegister();
  const [passwordValue, setPasswordValue] = useState('');
  const [agreed, setAgreed] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    registerUser(data);
  };

  const passwordField = register('password');

  const handleAgreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setAgreed(isChecked);
    setValue('accept_terms', isChecked, { shouldValidate: true });
    setValue('accept_privacy', isChecked, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <AuthField label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
        <input
          id="full_name"
          placeholder="Jane Doe"
          autoComplete="name"
          {...register('full_name')}
          disabled={isPending}
          className={cn(fieldInputClass, 'h-10')}
        />
      </AuthField>

      <AuthField label="Work email" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          disabled={isPending}
          className={cn(fieldInputClass, 'h-10 font-mono text-[13px]')}
        />
      </AuthField>

      <AuthField label="Password" htmlFor="password" error={errors.password?.message}>
        <div className="flex flex-col gap-2">
          <PasswordInput
            id="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            {...passwordField}
            onChange={(event) => {
              passwordField.onChange(event);
              setPasswordValue(event.target.value);
            }}
            disabled={isPending}
          />
          <PasswordStrength value={passwordValue} />
        </div>
      </AuthField>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)]/60 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="accept_terms_and_privacy"
            checked={agreed}
            onChange={handleAgreeChange}
            disabled={isPending}
            className={CHECKBOX_CLASS}
          />
          <label htmlFor="accept_terms_and_privacy" className="cursor-pointer text-[12px] leading-relaxed text-[var(--text2)]">
            I agree to the{' '}
            <a
              href="https://sentinel.com/terms"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-[var(--brand)] hover:text-[var(--brand-d)]"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="https://sentinel.com/privacy"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-[var(--brand)] hover:text-[var(--brand-d)]"
            >
              Privacy Policy
            </a>
          </label>
        </div>
        {(errors.accept_terms || errors.accept_privacy) && (
          <p role="alert" className="mt-1.5 text-[12px] font-medium text-[var(--red)]">
            {errors.accept_terms?.message || errors.accept_privacy?.message || 'You must accept the terms and privacy policy to continue.'}
          </p>
        )}
      </div>

      <AuthButton type="submit" pending={isPending}>
        Create account
      </AuthButton>
    </form>
  );
}
