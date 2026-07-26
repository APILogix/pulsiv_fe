import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { useVerifyEmail } from '../hooks/useVerifyEmail';
import { useResendVerification } from '../hooks/useResendVerification';
import {
  AuthButton,
  AuthCard,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthResult,
  IconChip,
  Notice,
} from '@/shared/ui/pulse';

// One-off: a primary action that navigates instead of submitting. Mirrors
// AuthButton's primary tone, which is button-only in the kit.
function PrimaryLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 w-full items-center justify-center rounded-[9px] bg-[var(--brand)] text-[13.5px] font-semibold text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg1)]"
    >
      {children}
    </Link>
  );
}

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
        <AuthResult
          icon={CheckCircle2}
          tone="green"
          title="Email verified"
          description="Your address is confirmed. Sign in to finish setting up your workspace."
          actions={<PrimaryLink to="/auth/login">Sign in to your account</PrimaryLink>}
        />
      </div>
    );
  }

  if (token && isVerifying) {
    return (
      <div className="w-full">
        <AuthHeading
          eyebrow="Email verification"
          icon={MailCheck}
          tone="ai"
          title="Verifying your email"
          description="Hold on while we confirm the link you opened."
        />
        <AuthCard>
          <div className="flex items-center gap-3">
            <IconChip icon={MailCheck} tone="ai" size="sm" />
            <p className="flex items-center gap-2 text-[13px] text-[var(--text2)]" role="status" aria-live="polite">
              <Loader2 className="size-3.5 animate-spin text-[var(--ai)]" aria-hidden="true" />
              Checking the verification token…
            </p>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Email verification"
        icon={MailCheck}
        title="Verify your email"
        description="We sent a verification link to your inbox. Open it to activate your account."
      />

      <AuthCard>
        {email && (
          <div className="mb-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text3)]">Sent to</p>
            <p className="mt-0.5 truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{email}</p>
          </div>
        )}

        <Notice tone="blue">
          Links expire after 24 hours. Check your spam folder if it hasn&apos;t arrived.
        </Notice>

        <div className="mt-4">
          <AuthButton
            type="button"
            variant="ghost"
            onClick={() => {
              if (email) {
                resendEmail({ email });
              }
            }}
            disabled={!email}
            pending={isResending}
          >
            {email ? 'Resend verification email' : 'Resend needs your email address'}
          </AuthButton>
        </div>
      </AuthCard>

      <AuthFooter>
        <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
