import { useState } from 'react';
import { toast } from 'sonner';
import { RegisterForm } from '../components/RegisterForm';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthCard,
  AuthDivider,
  AuthFooter,
  AuthHeading,
  AuthLink,
  OAuthButton,
} from '@/shared/ui/pulse';

// Google's mark keeps its own brand palette — third-party asset colours,
// not theme tokens.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.25-.95 2.3-2 3.01l3.23 2.5c1.88-1.73 2.97-4.27 2.97-7.3 0-.71-.06-1.39-.18-2.04H12z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.23-2.5c-.9.6-2.05.95-3.38.95-2.6 0-4.81-1.75-5.6-4.1l-3.34 2.58A9.99 9.99 0 0 0 12 22z" />
      <path fill="#4A90E2" d="M6.4 13.9A6 6 0 0 1 6.09 12c0-.66.11-1.3.31-1.9L3.06 7.52A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.48l3.34-2.58z" />
      <path fill="#FBBC05" d="M12 5.98c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.95 2.96 14.7 2 12 2 8.08 2 4.7 4.24 3.06 7.52l3.34 2.58c.79-2.35 3-4.12 5.6-4.12z" />
    </svg>
  );
}

export default function RegisterPage() {
  const [socialProvider, setSocialProvider] = useState<string | null>(null);

  async function startSocialLogin(provider: 'github' | 'google') {
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
        <OAuthButton
          icon={<GoogleIcon />}
          onClick={() => startSocialLogin('google')}
          disabled={socialProvider !== null}
          pending={socialProvider === 'google'}
        >
          Sign up with Google
        </OAuthButton>

        <AuthDivider>or register with email</AuthDivider>

        <RegisterForm />
      </AuthCard>

      <AuthFooter>
        Already have an account? <AuthLink to="/auth/login">Sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
