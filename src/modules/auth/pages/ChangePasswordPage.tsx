import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordFormData } from '../schemas/auth.schema';
import { authApi } from '../api/auth.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { useState } from 'react';

export default function ChangePasswordPage() {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => { setSuccess('Password changed.'); setError(''); },
    onError: (err) => { setError(getErrorMessage(err)); setSuccess(''); },
  });

  const onSubmit = (data: ChangePasswordFormData) => mutation.mutate(data);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Change Password</h1>
      <Card>
        <CardHeader><CardTitle>Update Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" {...register('current_password')} />
              {errors.current_password && <p className="text-destructive text-sm">{errors.current_password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" {...register('new_password')} />
              {errors.new_password && <p className="text-destructive text-sm">{errors.new_password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_new_password">Confirm New Password</Label>
              <Input id="confirm_new_password" type="password" {...register('confirm_new_password')} />
              {errors.confirm_new_password && <p className="text-destructive text-sm">{errors.confirm_new_password.message}</p>}
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}
            <Button type="submit" disabled={isSubmitting}>Change Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}