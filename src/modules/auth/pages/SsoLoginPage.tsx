import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ssoLoginSchema, type SsoLoginFormData } from '../schemas/auth.schema';
import { authApi } from '../api/auth.api';
import type { SsoDiscoveryResult } from '../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthButton,
  AuthCallout,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthNote,
  fieldInputClass,
} from '@/shared/ui/pulse';

/** What discovery found for the domain: one hairline list, no nested cards. */
function DiscoveryResult({ discovery }: { discovery: SsoDiscoveryResult }) {
  if (discovery.providers.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-[var(--text3)]">
        Identity providers for <span className="font-mono text-[var(--text2)]">{discovery.domain}</span>
      </p>
      <ul className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)]">
        {discovery.providers.map((provider) => (
          <li key={provider.provider_id} className="flex items-center justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--text)]">{provider.provider_name}</p>
              <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">{provider.org_name}</p>
            </div>
            <span className="shrink-0 font-mono text-[11px] uppercase text-[var(--text3)]">
              {provider.provider_type}
            </span>
          </li>
        ))}
      </ul>
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
        setError(
          'No single sign-on provider is set up for this email domain. Sign in with email and password, or ask your workspace admin to set up SSO.',
        );
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
        title="Sign in with SSO"
        description="Enter your work email and we'll send you to your organization's identity provider."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <AuthField
          label="Work email"
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
            className={cn(fieldInputClass, 'h-11 text-[14px]')}
          />
        </AuthField>

        {error && (
          <AuthCallout icon={ShieldAlert} tone="danger" role="alert" title="Can't continue with SSO">
            {error}
          </AuthCallout>
        )}

        {discovery && <DiscoveryResult discovery={discovery} />}

        <AuthButton type="submit" pending={loading}>
          Continue
        </AuthButton>
      </form>

      <AuthNote className="mt-4">
        Your identity provider handles authentication and returns you to Sentinel. Session length is set by your
        organization.
      </AuthNote>

      <AuthFooter>
        Not using SSO? <AuthLink to="/auth/login">Sign in with email</AuthLink>
      </AuthFooter>
    </div>
  );
}
