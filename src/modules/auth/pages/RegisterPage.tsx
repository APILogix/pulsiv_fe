import { useState } from 'react';
import { toast } from 'sonner';
import { RegisterForm } from '../components/RegisterForm';
import { SocialProviderButtons, type SocialProvider } from '../components/SocialProviders';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthCard,
  AuthDivider,
  AuthFooter,
  AuthHeading,
  AuthLink,
} from '@/shared/ui/pulse';

export default function RegisterPage() {
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);

  async function startSocialLogin(provider: SocialProvider) {
    setSocialProvider(provider);
    try {
      const result = await authApi.socialLogin(provider);
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSocialProvider(null);
    }
  }

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Get started"
        title="Create your account"
        description="Start monitoring your global infrastructure in seconds. No card required."
      />

      <AuthCard>
        <SocialProviderButtons
          onSelect={startSocialLogin}
          pendingProvider={socialProvider}
          verb="Sign up with"
        />

        <AuthDivider>or register with email</AuthDivider>

        <RegisterForm />
      </AuthCard>

      <AuthFooter>
        Already have an account? <AuthLink to="/auth/login">Sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
