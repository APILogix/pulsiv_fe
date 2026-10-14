import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schema';
import { useRegister } from '../hooks/useRegister';
import { AuthButton, AuthField, PasswordInput, fieldInputClass } from '@/shared/ui/pulse';
import { PasswordRequirements } from './PasswordRequirements';

const CHECKBOX_CLASS =
  'mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px] border-[var(--border2)] bg-[var(--bg2)] accent-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]';

const LEGAL_LINK_CLASS =
  'rounded-sm font-medium text-[var(--text)] underline decoration-[var(--border2)] underline-offset-4 transition-colors hover:decoration-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]';

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

  const legalError = errors.accept_terms || errors.accept_privacy;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <AuthField label="Full name" htmlFor="full_name" error={errors.full_name ? 'Enter your name.' : undefined}>
        <input
          id="full_name"
          placeholder="Jane Doe"
          autoComplete="name"
          autoFocus
          {...register('full_name')}
          disabled={isPending}
          className={cn(fieldInputClass, 'h-11 text-[14px]')}
        />
      </AuthField>

      <AuthField
        label="Work email"
        htmlFor="email"
        error={errors.email ? 'Enter a valid email address.' : undefined}
      >
        <input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          disabled={isPending}
          className={cn(fieldInputClass, 'h-11 text-[14px]')}
        />
      </AuthField>

      <AuthField label="Password" htmlFor="password" error={errors.password?.message}>
        <div className="flex flex-col gap-3">
          <PasswordInput
            id="password"
            placeholder="Create a password"
            autoComplete="new-password"
            aria-describedby="password-requirements"
            className="h-11 text-[14px]"
            {...passwordField}
            onChange={(event) => {
              passwordField.onChange(event);
              setPasswordValue(event.target.value);
            }}
            disabled={isPending}
          />
          <PasswordRequirements id="password-requirements" value={passwordValue} />
        </div>
      </AuthField>

      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="accept_terms_and_privacy"
            checked={agreed}
            onChange={handleAgreeChange}
            disabled={isPending}
            aria-invalid={legalError ? true : undefined}
            className={CHECKBOX_CLASS}
          />
          <label htmlFor="accept_terms_and_privacy" className="cursor-pointer text-[13px] leading-[1.5] text-[var(--text2)]">
            I agree to the{' '}
            <a href="https://sentinel.com/terms" target="_blank" rel="noreferrer noopener" className={LEGAL_LINK_CLASS}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="https://sentinel.com/privacy" target="_blank" rel="noreferrer noopener" className={LEGAL_LINK_CLASS}>
              Privacy Policy
            </a>
          </label>
        </div>
        {legalError && (
          <p role="alert" className="pl-[26px] text-[12px] font-medium text-[var(--red)]">
            Accept the terms and privacy policy to create your account.
          </p>
        )}
      </div>

      <AuthButton type="submit" pending={isPending}>
        Create account
      </AuthButton>
    </form>
  );
}
