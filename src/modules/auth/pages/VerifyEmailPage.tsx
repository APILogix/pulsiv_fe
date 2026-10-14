import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useVerifyEmail } from '../hooks/useVerifyEmail';
import { useResendVerification } from '../hooks/useResendVerification';
import {
  AuthButton,
  AuthFact,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthLinkButton,
  AuthNote,
  AuthPending,
} from '@/shared/ui/pulse';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const status = params.get('status');
  const token = params.get('token');
  const email = params.get('email');

  const { mutate: verifyEmail, isPending: isVerifying } = useVerifyEmail();
  const { mutate: resendEmail, isPending: isResending } = useResendVerification();

  useEffect(() => {
    if (token && status !== 'success') {
      verifyEmail({ token });
    }
  }, [token, status, verifyEmail]);

  if (status === 'success') {
    return (
      <div className="w-full">
        <AuthHeading
          title="Email verified"
          description="Your address is confirmed. Sign in to finish setting up your workspace."
        />
        <AuthLinkButton to="/auth/login">Sign in</AuthLinkButton>
      </div>
    );
  }

  if (token && isVerifying) {
    return (
      <div className="w-full">
        <AuthHeading title="Verifying your email" description="Hold on while we confirm the link you opened." />
        <AuthPending>Checking the verification link…</AuthPending>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        title="Verify your email"
        description="We sent a verification link to your inbox. Open it to activate your account."
      />

      <div className="flex flex-col gap-4">
        {email && <AuthFact label="Sent to" value={email} />}

        <AuthButton
          type="button"
          variant="ghost"
          onClick={() => {
            if (email) resendEmail({ email });
          }}
          disabled={!email}
          pending={isResending}
        >
          Resend verification email
        </AuthButton>

        <AuthNote>
          {email
            ? "Links expire after 24 hours. Check your spam folder if it hasn't arrived."
            : "Resending needs the address the link went to, and this page didn't receive one. Links expire after 24 hours."}
        </AuthNote>
      </div>

      <AuthFooter>
        <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
