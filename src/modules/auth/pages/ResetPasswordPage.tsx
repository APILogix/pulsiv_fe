import { useState } from 'react';
import { useSearchParams, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '../schemas/auth.schema';
import type { ResetPasswordFormData } from '../schemas/auth.schema';
import { useResetPassword } from '../hooks/useResetPassword';
import { PasswordRequirements } from '../components/PasswordRequirements';
import {
  AuthButton,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthNote,
  PasswordInput,
} from '@/shared/ui/pulse';

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
        title="Choose a new password"
        description="Use one you don't use anywhere else. Other devices will need to sign in again."
      />

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <AuthField label="New password" htmlFor="password" error={errors.new_password?.message}>
          <div className="flex flex-col gap-3">
            <PasswordInput
              id="password"
              placeholder="Create a password"
              autoComplete="new-password"
              autoFocus
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

        <AuthField label="Confirm new password" htmlFor="confirm" error={errors.confirm_password?.message}>
          <PasswordInput
            id="confirm"
            placeholder="Re-enter the password"
            autoComplete="new-password"
            className="h-11 text-[14px]"
            {...register('confirm_password')}
            disabled={isPending}
          />
        </AuthField>

        <AuthButton type="submit" pending={isPending}>
          Update password
        </AuthButton>
      </form>

      <AuthNote className="mt-4">
        This link works once. If it expires before you finish,{' '}
        <AuthLink to="/auth/forgot-password">request a new one</AuthLink>.
      </AuthNote>

      <AuthFooter>
        <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
