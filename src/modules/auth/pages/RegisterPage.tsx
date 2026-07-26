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

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-[18px]">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

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
        <div className="flex flex-col gap-2.5">
          <OAuthButton
            icon={<GitHubIcon />}
            onClick={() => startSocialLogin('github')}
            disabled={socialProvider !== null}
            pending={socialProvider === 'github'}
          >
            Sign up with GitHub
          </OAuthButton>
          <OAuthButton
            icon={<GoogleIcon />}
            onClick={() => startSocialLogin('google')}
            disabled={socialProvider !== null}
            pending={socialProvider === 'google'}
          >
            Sign up with Google
          </OAuthButton>
        </div>

        <AuthDivider>or register with email</AuthDivider>

        <RegisterForm />
      </AuthCard>

      <AuthFooter>
        Already have an account? <AuthLink to="/auth/login">Sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
