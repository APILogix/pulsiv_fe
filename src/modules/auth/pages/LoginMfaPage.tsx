import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../api/auth.api';
import { loginMfaSchema } from '../schemas/auth.schema';
import type { LoginMfaFormData } from '../schemas/auth.schema';
import { useAuthStore } from '../store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';

export default function LoginMfaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { challengeId } = location.state || {};
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginMfaFormData>({
    resolver: zodResolver(loginMfaSchema),
  });

  const onSubmit = handleSubmit((data) => {
    setError('');
    authApi.loginMfa({ ...data, challenge_id: challengeId }).then(() => {
      authApi.getCurrentUser().then((user) => {
        setAuth(user);
        navigate('/dashboard', { replace: true });
      });
    }).catch((err) => setError(getErrorMessage(err)));
  });

  if (!challengeId) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            Two-factor verification
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-xs text-[#999999]">Verification code</Label>
            <Input
              id="code"
              maxLength={6}
              {...register('code')}
              placeholder="000000"
              autoComplete="one-time-code"
              className="h-12 font-mono text-center tracking-[0.3em] text-lg bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
            />
            {errors.code && <p className="text-[#ef4444] text-xs mt-1">{errors.code.message}</p>}
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/10 text-sm text-[#ef4444]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}
          <Button type="submit" className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors">
            Verify identity
          </Button>
        </form>
      </div>

      <div className="flex flex-col items-center gap-2 text-sm text-[#555555]">
        <Link to="/auth/login/backup-code" className="hover:text-[#999999] transition-colors">
          Use a backup code
        </Link>
        <Link to="/auth/login" className="hover:text-[#999999] transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
