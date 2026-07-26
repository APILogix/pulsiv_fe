import { useState } from 'react';
import { useSearchParams, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { resetPasswordSchema } from '../schemas/auth.schema';
import type { ResetPasswordFormData } from '../schemas/auth.schema';
import { useResetPassword } from '../hooks/useResetPassword';
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthLink,
  Notice,
  PasswordInput,
  PasswordStrength,
} from '@/shared/ui/pulse';

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters' },
  { id: 'case', label: 'Upper and lowercase letters' },
  { id: 'mix', label: 'One number and one symbol' },
];

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [passwordValue, setPasswordValue] = useState('');
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

  const passwordField = register('new_password');

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Account recovery"
        icon={KeyRound}
        title="Set a new password"
        description="Choose a password you don't use anywhere else. Signing in again on other devices will be required."
      />

      <AuthCard>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <AuthField label="New password" htmlFor="password" error={errors.new_password?.message}>
            <div className="flex flex-col gap-2">
              <PasswordInput
                id="password"
                placeholder="Create a strong password"
                autoComplete="new-password"
                autoFocus
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

          <AuthField label="Confirm password" htmlFor="confirm" error={errors.confirm_password?.message}>
            <PasswordInput
              id="confirm"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              {...register('confirm_password')}
              disabled={isPending}
            />
          </AuthField>

          <ul className="flex flex-col gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)]/60 px-3.5 py-3">
            {PASSWORD_RULES.map((rule) => (
              <li key={rule.id} className="flex items-center gap-2 text-[12px] text-[var(--text2)]">
                <span className="size-1.5 shrink-0 rounded-full bg-[var(--border2)]" aria-hidden="true" />
                {rule.label}
              </li>
            ))}
          </ul>

          <AuthButton type="submit" pending={isPending}>
            Reset password
          </AuthButton>
        </form>

        <Notice tone="blue" className="mt-4">
          This reset link is single-use. Request a new one if it expires before you finish.
        </Notice>
      </AuthCard>

      <AuthFooter>
        <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
