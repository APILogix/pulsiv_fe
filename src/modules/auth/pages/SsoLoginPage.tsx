import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ssoLoginSchema, type SsoLoginFormData } from '../schemas/auth.schema';
import { authApi } from '../api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Link } from 'react-router';

export default function SsoLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<SsoLoginFormData>({
    resolver: zodResolver(ssoLoginSchema),
  });

  const onSubmit = handleSubmit((data) => {
    setError('');
    setLoading(true);
    authApi.ssoLogin(data)
      .then((result) => {
        window.location.assign(result.authorization_url);
      })
      .catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
  });

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            Sign in with SSO
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            Enter your work email to discover your organization&apos;s sign-in method.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-[#999999]">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register('email')}
              className="h-10 bg-[#161616] border-[#262626] text-[#e8e8e8] placeholder:text-[#555555] focus:border-[#34d399] focus:ring-1 focus:ring-[#34d399]/30 transition-colors"
            />
            {errors.email && <p className="text-[#ef4444] text-xs mt-1">{errors.email.message}</p>}
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/10 text-sm text-[#ef4444]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" /></svg>
                Redirecting...
              </span>
            ) : 'Continue with SSO'}
          </Button>
        </form>
      </div>

      <div className="text-center text-sm text-[#555555]">
        <Link to="/auth/login" className="hover:text-[#999999] transition-colors">
          Sign in with email instead
        </Link>
      </div>
    </div>
  );
}