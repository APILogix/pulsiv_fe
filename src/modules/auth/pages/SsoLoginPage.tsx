import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ssoLoginSchema, type SsoLoginFormData } from '../schemas/auth.schema';
import { authApi } from '../api/auth.api';
import type { SsoDiscoveryResult } from '../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthLink,
  Notice,
  Pill,
  fieldInputClass,
} from '@/shared/ui/pulse';

// One-off: the discovered identity provider list for a domain.
function DiscoveryPanel({ discovery }: { discovery: SsoDiscoveryResult }) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-3.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text3)]">Detected domain</p>
      <p className="mt-1 font-[family-name:var(--mono)] text-[13px] text-[var(--text)]">{discovery.domain}</p>

      {discovery.providers.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {discovery.providers.map((provider) => (
            <div
              key={provider.provider_id}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--text)]">{provider.provider_name}</p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">{provider.org_name}</p>
              </div>
              <Pill tone="ai">{provider.provider_type}</Pill>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SsoLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [discovery, setDiscovery] = useState<SsoDiscoveryResult | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<SsoLoginFormData>({
    resolver: zodResolver(ssoLoginSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    setError('');
    setDiscovery(null);
    setLoading(true);

    try {
      const email = data.email ?? '';
      const discovered = await authApi.discoverSSO(email);
      setDiscovery(discovered);

      if (!discovered.sso_available || (!discovered.saml_login_ready && !discovered.oidc_login_ready)) {
        setError('No SSO provider is configured for this email domain.');
        setLoading(false);
        return;
      }

      const result = await authApi.ssoLogin(data);
      window.location.assign(result.authorization_url);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  });

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Enterprise access"
        icon={Building2}
        title="Sign in with SSO"
        description="Enter your work email and we'll route you to your organization's identity provider."
      />

      <AuthCard>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <AuthField
            label="Work email or domain"
            htmlFor="email"
            hint="We match the domain against configured SAML and OIDC providers."
            error={errors.email ? 'Enter a valid work email address.' : undefined}
          >
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
              {...register('email')}
              disabled={loading}
              className={cn(fieldInputClass, 'h-11 font-[family-name:var(--mono)] text-[13px]')}
            />
          </AuthField>

          {error && (
            <Notice tone="red" icon={ShieldAlert}>
              {error}
            </Notice>
          )}

          {discovery && <DiscoveryPanel discovery={discovery} />}

          <AuthButton type="submit" pending={loading}>
            Continue with SSO
          </AuthButton>
        </form>

        <Notice tone="blue" icon={Info} className="mt-4">
          You&apos;ll be redirected to your identity provider to authenticate, then returned to Pulsiv. Session policy is
          set by your organization.
        </Notice>
      </AuthCard>

      <AuthFooter>
        Not using SSO? <AuthLink to="/auth/login">Sign in with email</AuthLink>
      </AuthFooter>
    </div>
  );
}
