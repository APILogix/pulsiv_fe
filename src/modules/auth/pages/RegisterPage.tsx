import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { RegisterForm } from '../components/RegisterForm';
import { SocialProviderButtons, type SocialProvider } from '../components/SocialProviders';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { AuthDivider, AuthHeading, AuthLink } from '@/shared/ui/pulse';

export default function RegisterPage() {
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);

  const startSocialLogin = useCallback((provider: SocialProvider) => {
    setSocialProvider(provider);
    authApi
      .socialLogin(provider)
      .then((result) => {
        window.location.assign(result.authorization_url);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error));
        setSocialProvider(null);
      });
  }, []);

  return (
    <div className="w-full">
      <AuthHeading
        title="Create your Sentinel account"
        description={
          <>
            No card required. Already have an account? <AuthLink to="/auth/login">Sign in</AuthLink>
          </>
        }
      />

      <RegisterForm />

      <AuthDivider>or</AuthDivider>

      <SocialProviderButtons
        onSelect={startSocialLogin}
        pendingProvider={socialProvider}
        verb="Sign up with"
      />
    </div>
  );
}
